import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "path";
import fs from "fs";
import { prisma } from "./lib/prisma";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
// Usa o scraper com Puppeteer em vez da API (que bloqueia requisições)
import {
  fetchBrasileiraoGames,
  testScraping,
} from "./services/sofascoreScraper";

dayjs.locale("pt-br");

const app = Fastify({ logger: true });

// Timer para enviar ranking parcial após salvar resultados
let partialRankingTimer: NodeJS.Timeout | null = null;

/**
 * Adiciona sufixo do telefone ao nome quando há jogadores com mesmo nome
 */
async function addDisplayNames<
  T extends { id: string | number; name: string; phone: string },
>(players: T[]): Promise<(T & { displayName: string })[]> {
  // Agrupa jogadores por nome (case insensitive)
  const nameGroups = new Map<string, T[]>();

  for (const player of players) {
    const nameLower = player.name.toLowerCase();
    if (!nameGroups.has(nameLower)) {
      nameGroups.set(nameLower, []);
    }
    nameGroups.get(nameLower)!.push(player);
  }

  // Adiciona displayName com sufixo se necessário
  return players.map((player) => {
    const nameLower = player.name.toLowerCase();
    const group = nameGroups.get(nameLower)!;

    // Se só tem 1 jogador com esse nome, usa o nome normal
    if (group.length === 1) {
      return { ...player, displayName: player.name };
    }

    // Se há duplicatas, adiciona últimos 3 dígitos do telefone
    const phoneSuffix = player.phone.slice(-3);
    return { ...player, displayName: `${player.name} (${phoneSuffix})` };
  });
}

// Plugin para servir arquivos estáticos manualmente
app.register(cors, { origin: true });

// Servir arquivos estáticos
app.get("/", async (request, reply) => {
  const filePath = path.join(__dirname, "public", "index.html");
  const content = fs.readFileSync(filePath, "utf-8");
  reply.type("text/html").send(content);
});

// ============================================
// ROTAS DA API
// ============================================

// Estatísticas do sistema
app.get("/api/stats", async () => {
  const [games, bets, groups] = await Promise.all([
    prisma.match.count(),
    prisma.bet.count(),
    prisma.group.count(),
  ]);
  return { games, bets, groups };
});

// Lista todas as rodadas/jogos
app.get("/api/matches", async () => {
  const matches = await prisma.match.findMany({
    orderBy: [{ round: "desc" }, { matchDate: "asc" }],
    include: {
      _count: { select: { bets: true } },
    },
  });
  return matches;
});

// Busca jogos de uma rodada específica (nova rota)
app.get("/api/matches/round/:round", async (request) => {
  const { round } = request.params as { round: string };
  const matches = await prisma.match.findMany({
    where: { round: parseInt(round) },
    orderBy: { matchDate: "asc" },
    include: {
      _count: { select: { bets: true } },
    },
  });
  return matches;
});

// Busca jogos de uma rodada (compatibilidade com frontend)
app.get("/api/games", async (request) => {
  const { round } = request.query as { round?: string };
  const matches = await prisma.match.findMany({
    where: round ? { round: parseInt(round) } : undefined,
    orderBy: { matchDate: "asc" },
  });
  // Retorna no formato esperado pelo frontend
  return matches.map((m: (typeof matches)[0]) => ({
    id: m.id,
    round: m.round,
    home_team: m.homeTeam,
    away_team: m.awayTeam,
    game_date: m.matchDate,
    home_score: m.homeScore,
    away_score: m.awayScore,
    status: m.status,
  }));
});

// Busca jogos pendentes (sem resultado)
app.get("/api/games/pending", async () => {
  const matches = await prisma.match.findMany({
    where: { homeScore: null },
    orderBy: [{ round: "asc" }, { matchDate: "asc" }],
  });
  return matches.map((m: (typeof matches)[0]) => ({
    id: m.id,
    round: m.round,
    home_team: m.homeTeam,
    away_team: m.awayTeam,
    game_date: m.matchDate,
    home_score: m.homeScore,
    away_score: m.awayScore,
    status: m.status,
  }));
});

// Cadastra um novo jogo
app.post("/api/matches", async (request) => {
  const { round, homeTeam, awayTeam, matchDate } = request.body as {
    round: number;
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
  };

  // Preserva o horário local de Brasília
  const dateWithTimezone = new Date(matchDate + ":00-03:00");

  const match = await prisma.match.create({
    data: {
      round,
      homeTeam,
      awayTeam,
      matchDate: dateWithTimezone,
      status: "SCHEDULED",
      groupId: null,
    },
  });

  return match;
});

// Cadastra vários jogos de uma vez
app.post("/api/matches/bulk", async (request) => {
  const { round, matches } = request.body as {
    round: number;
    matches: Array<{
      homeTeam: string;
      awayTeam: string;
      matchDate: string;
    }>;
  };

  const created = await prisma.match.createMany({
    data: matches.map((m) => ({
      round,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      matchDate: new Date(m.matchDate),
      status: "SCHEDULED" as const,
      groupId: null,
    })),
  });

  return { count: created.count };
});

// Atualiza resultado de um jogo
app.put("/api/matches/:id/result", async (request) => {
  const { id } = request.params as { id: string };
  const { homeScore, awayScore } = request.body as {
    homeScore: number;
    awayScore: number;
  };

  // Atualiza o jogo
  const match = await prisma.match.update({
    where: { id },
    data: {
      homeScore,
      awayScore,
      status: "FINISHED",
    },
  });

  // Calcula pontos dos palpites
  const bets = await prisma.bet.findMany({
    where: { matchId: id },
  });

  for (const bet of bets) {
    const points = calculatePoints(
      { homeScore, awayScore },
      { homeScore: bet.homeScoreGuess, awayScore: bet.awayScoreGuess },
    );

    await prisma.bet.update({
      where: { id: bet.id },
      data: { points },
    });
  }

  // Agenda ranking parcial para 2 minutos depois
  schedulePartialRanking(match.round);

  return { ...match, betsUpdated: bets.length };
});

// Deleta um jogo
app.delete("/api/matches/:id", async (request) => {
  const { id } = request.params as { id: string };
  await prisma.match.delete({ where: { id } });
  return { success: true };
});

// Lista jogadores
app.get("/api/players", async (request, reply) => {
  try {
    const players = await prisma.player.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    // Filtra para remover qualquer coisa entre parênteses que venha do banco
    const cleanPlayers = players.map((p) => {
      // Remove sufixos como (lid:xxxxx) ou (12345) do nome
      const cleanName = p.name.replace(/\s*\(.*?\).*$/, "").trim();
      return {
        id: p.id,
        name: cleanName,
      };
    });

    return cleanPlayers;
  } catch (error) {
    console.error("Erro ao listar jogadores:", error);
    return [];
  }
});

// ============================================
// ROTAS DE COMPATIBILIDADE (frontend usa /api/games)
// ============================================

// Criar jogo (compatibilidade com frontend)
app.post("/api/games", async (request) => {
  const body = request.body as {
    round: number;
    // Aceita ambos os formatos
    homeTeam?: string;
    awayTeam?: string;
    matchDate?: string;
    home_team?: string;
    away_team?: string;
    game_date?: string;
  };

  const round = body.round;
  const homeTeam = body.homeTeam || body.home_team;
  const awayTeam = body.awayTeam || body.away_team;
  const matchDate = body.matchDate || body.game_date;

  if (!homeTeam || !awayTeam || !matchDate) {
    return { error: "Campos obrigatórios faltando" };
  }

  // Preserva o horário local (datetime-local vem sem timezone)
  // Adiciona o timezone de Brasília para salvar corretamente
  const dateWithTimezone = new Date(matchDate + ":00-03:00");

  const match = await prisma.match.create({
    data: {
      round,
      homeTeam,
      awayTeam,
      matchDate: dateWithTimezone,
      status: "SCHEDULED",
      groupId: null,
    },
  });

  return match;
});

// Atualizar resultado (compatibilidade)
app.put("/api/games/:id/result", async (request) => {
  const { id } = request.params as { id: string };
  // Aceita tanto camelCase quanto snake_case do frontend
  const body = request.body as {
    homeScore?: number;
    awayScore?: number;
    home_score?: number;
    away_score?: number;
  };

  const homeScore = body.homeScore ?? body.home_score;
  const awayScore = body.awayScore ?? body.away_score;

  if (homeScore === undefined || awayScore === undefined) {
    return { error: "homeScore e awayScore são obrigatórios" };
  }

  const match = await prisma.match.update({
    where: { id },
    data: {
      homeScore,
      awayScore,
      status: "FINISHED",
    },
  });

  // Calcula pontos dos palpites
  const bets = await prisma.bet.findMany({
    where: { matchId: id },
  });

  for (const bet of bets) {
    const points = calculatePoints(
      { homeScore, awayScore },
      { homeScore: bet.homeScoreGuess, awayScore: bet.awayScoreGuess },
    );

    await prisma.bet.update({
      where: { id: bet.id },
      data: { points },
    });
  }

  // Agenda ranking parcial para 2 minutos depois
  schedulePartialRanking(match.round);

  return { ...match, betsUpdated: bets.length };
});

// Deletar jogo (compatibilidade)
app.delete("/api/games/:id", async (request) => {
  const { id } = request.params as { id: string };
  await prisma.match.delete({ where: { id } });
  return { success: true };
});

// ============================================
// INTEGRAÇÃO SOFASCORE
// ============================================

// Sincroniza jogos do dia do SofaScore
app.post("/api/sync/today", async () => {
  try {
    const today = new Date();
    const games = await fetchBrasileiraoGames(today);

    if (games.length === 0) {
      return {
        success: true,
        message: "Nenhum jogo do Brasileirão hoje",
        added: 0,
        updated: 0,
      };
    }

    // Busca o grupo ativo
    const group = await prisma.group.findFirst({
      where: { isActive: true },
    });

    let added = 0;
    let updated = 0;

    for (const game of games) {
      // Verifica se já existe um jogo com mesmos times e rodada
      const existing = await prisma.match.findFirst({
        where: {
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          round: game.round,
        },
      });

      if (existing) {
        // Atualiza se necessário
        if (
          existing.status !== game.status ||
          existing.homeScore !== game.homeScore ||
          existing.awayScore !== game.awayScore
        ) {
          await prisma.match.update({
            where: { id: existing.id },
            data: {
              status: game.status,
              homeScore: game.homeScore,
              awayScore: game.awayScore,
            },
          });
          updated++;
        }
      } else {
        // Cria novo jogo
        await prisma.match.create({
          data: {
            groupId: group?.id || null,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            matchDate: game.matchDate,
            round: game.round,
            status: game.status,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
          },
        });
        added++;
      }
    }

    return {
      success: true,
      message: `Sincronização completa`,
      added,
      updated,
      total: games.length,
    };
  } catch (error) {
    console.error("Erro ao sincronizar:", error);
    return { success: false, error: String(error) };
  }
});

// Testa se o scraping está funcionando
app.get("/api/sofascore/test", async () => {
  const result = await testScraping();
  return result;
});

// Ranking geral
app.get("/api/ranking", async () => {
  const players = await prisma.player.findMany({
    include: {
      bets: {
        where: { points: { not: null } },
        select: { points: true },
      },
    },
  });

  interface PlayerWithBets {
    id: string;
    name: string;
    phone: string;
    bets: { points: number | null }[];
  }

  const ranking = (players as PlayerWithBets[])
    .map((p) => {
      const betsWithPoints = p.bets.filter((b) => b.points !== null);
      return {
        id: Number(p.id),
        name: p.name,
        phone: p.phone,
        totalPoints: betsWithPoints.reduce(
          (sum: number, b) => sum + (b.points || 0),
          0,
        ),
        totalBets: betsWithPoints.length,
        exactScores: betsWithPoints.filter((b) => b.points === 2).length,
        correctWinners: betsWithPoints.filter((b) => b.points === 1).length,
      };
    })
    .sort((a, b) => {
      // Ordena por pontos, depois por exatos, depois por acertos
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
      return b.correctWinners - a.correctWinners;
    });

  // Adiciona displayName com diferenciação para duplicatas
  const rankingWithDisplayNames = await addDisplayNames(ranking);

  return rankingWithDisplayNames;
});

// Ranking por rodada específica
app.get("/api/ranking/:round", async (request) => {
  const { round } = request.params as { round: string };
  const roundNumber = parseInt(round);

  // Busca jogos da rodada com palpites
  const matches = await prisma.match.findMany({
    where: { round: roundNumber },
    include: {
      bets: {
        include: { player: true },
      },
    },
  });

  if (matches.length === 0) {
    return { error: "Rodada não encontrada", ranking: [] };
  }

  // Calcula pontuação por jogador na rodada
  const playerStats = new Map<
    string,
    {
      id: string;
      name: string;
      phone: string;
      totalPoints: number;
      exactScores: number;
      correctWinners: number;
      totalBets: number;
    }
  >();

  for (const match of matches) {
    for (const bet of match.bets) {
      const existing = playerStats.get(bet.playerId) || {
        id: bet.player.id,
        name: bet.player.name,
        phone: bet.player.phone,
        totalPoints: 0,
        exactScores: 0,
        correctWinners: 0,
        totalBets: 0,
      };

      if (bet.points !== null) {
        existing.totalPoints += bet.points;
        existing.totalBets++;
        if (bet.points === 2) existing.exactScores++;
        if (bet.points === 1) existing.correctWinners++;
      }

      playerStats.set(bet.playerId, existing);
    }
  }

  const ranking = Array.from(playerStats.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return b.correctWinners - a.correctWinners;
  });

  const rankingWithDisplayNames = await addDisplayNames(ranking);

  const finishedMatches = matches.filter((m) => m.status === "FINISHED").length;

  return {
    round: roundNumber,
    totalMatches: matches.length,
    finishedMatches,
    ranking: rankingWithDisplayNames,
  };
});

// Lista rodadas disponíveis
app.get("/api/rounds", async () => {
  const rounds = await prisma.match.groupBy({
    by: ["round"],
    _count: { id: true },
    orderBy: { round: "asc" },
  });

  const roundsWithStatus = await Promise.all(
    rounds.map(async (r) => {
      const matches = await prisma.match.findMany({
        where: { round: r.round },
        select: { status: true },
      });
      const finished = matches.filter((m) => m.status === "FINISHED").length;
      return {
        round: r.round,
        totalMatches: r._count.id,
        finishedMatches: finished,
        isComplete: finished === r._count.id,
      };
    }),
  );

  return roundsWithStatus;
});

// Lista palpites de um jogo
app.get("/api/matches/:id/bets", async (request) => {
  const { id } = request.params as { id: string };

  const bets = await prisma.bet.findMany({
    where: { matchId: id },
    include: {
      player: { select: { name: true, phone: true } },
    },
  });

  return bets;
});

// ============================================
// FUNÇÃO DE CÁLCULO DE PONTOS
// 2 pts = placar exato | 1 pt = resultado correto
// ============================================

function calculatePoints(
  result: { homeScore: number; awayScore: number },
  guess: { homeScore: number; awayScore: number },
): number {
  const { homeScore: rHome, awayScore: rAway } = result;
  const { homeScore: gHome, awayScore: gAway } = guess;

  // Placar exato: 2 pontos
  if (rHome === gHome && rAway === gAway) {
    return 2;
  }

  // Resultado do jogo (quem venceu ou empate)
  const realResult = rHome > rAway ? "home" : rHome < rAway ? "away" : "draw";
  const guessResult = gHome > gAway ? "home" : gHome < gAway ? "away" : "draw";

  // Acertou o resultado (vitória mandante/visitante ou empate): 1 ponto
  if (realResult === guessResult) {
    return 1;
  }

  return 0;
}

// ============================================
// ENVIAR LEMBRETE MANUAL
// ============================================

/**
 * Envia lembrete manual para o grupo do WhatsApp
 */
app.post("/api/send-reminder", async (request, reply) => {
  try {
    const BOT_API_URL = process.env.BOT_API_URL || "http://localhost:3335";

    const response = await fetch(`${BOT_API_URL}/send-reminder`, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Erro ao enviar lembrete via API:", error);
      reply.code(500).send({ error: "Erro ao enviar lembrete" });
      return;
    }

    const result = await response.json();
    console.log("🔔 Lembrete manual enviado com sucesso");
    reply.send(result);
  } catch (error) {
    console.error("Erro ao enviar lembrete:", error);
    reply.code(500).send({ error: "Erro interno" });
  }
});

// ============================================
// RANKING PARCIAL AUTOMÁTICO
// ============================================

/**
 * Agenda envio de ranking parcial para 2 minutos depois
 * Cancela timer anterior se existir (para aguardar todos os resultados)
 */
function schedulePartialRanking(round: number) {
  // Cancela timer anterior se existir
  if (partialRankingTimer) {
    clearTimeout(partialRankingTimer);
  }

  // Agenda novo envio para 2 minutos
  partialRankingTimer = setTimeout(
    async () => {
      try {
        await sendPartialRanking(round);
        console.log(`📊 Ranking parcial da rodada ${round} enviado`);
      } catch (error) {
        console.error("Erro ao enviar ranking parcial:", error);
      }
    },
    2 * 60 * 1000,
  ); // 2 minutos

  console.log(`⏱️  Ranking parcial da rodada ${round} agendado para 2 minutos`);
}

/**
 * Envia ranking parcial para o grupo do WhatsApp via API do bot
 */
async function sendPartialRanking(round: number) {
  const BOT_API_URL = process.env.BOT_API_URL || "http://localhost:3335";

  try {
    const response = await fetch(
      `${BOT_API_URL}/send-partial-ranking?round=${round}`,
      { method: "POST" },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Erro ao enviar ranking via API:", error);
    }
  } catch (error) {
    console.error("Erro ao conectar com API do bot:", error);
  }
}

// Rota para buscar palpites com filtros
app.get("/api/guesses", async (request, reply) => {
  const { userId, round } = request.query as {
    userId?: string;
    round?: string;
  };

  const whereClause: any = {};

  // 1. CORREÇÃO: Se a tabela é 'Player', o campo de ligação é 'playerId'
  if (userId) whereClause.playerId = userId;

  // 2. CORREÇÃO: Se a tabela é 'Match', a relação é 'match'
  if (round) {
    whereClause.match = { round: parseInt(round) };
  }

  try {
    const bets = await prisma.bet.findMany({
      where: whereClause,
      include: {
        match: true, // <--- Agora está alinhado com a tabela Match
        player: true, // <--- Agora está alinhado com a tabela Player
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const processedBets = bets.map((bet) => {
      const gameData = bet.match;
      const playerData = bet.player;

      let status = "AGUARDANDO";
      let points = 0;

      // Verifica se o jogo terminou e tem placar
      if (
        gameData &&
        gameData.status === "FINISHED" &&
        gameData.homeScore !== null &&
        gameData.awayScore !== null
      ) {
        const realHome = gameData.homeScore;
        const realAway = gameData.awayScore;
        const palpiteHome = bet.homeScoreGuess;
        const palpiteAway = bet.awayScoreGuess;

        if (realHome === palpiteHome && realAway === palpiteAway) {
          status = "CRAVOU";
          points = 2;
        } else if (
          (realHome > realAway && palpiteHome > palpiteAway) ||
          (realAway > realHome && palpiteAway > palpiteHome) ||
          (realHome === realAway && palpiteHome === palpiteAway)
        ) {
          status = "ACERTOU_RESULTADO";
          points = 1;
        } else {
          status = "ERROU";
        }
      }

      return {
        ...bet,
        // Garante que o frontend receba os objetos preenchidos
        match: gameData,
        player: playerData,
        homeScore: bet.homeScoreGuess,
        awayScore: bet.awayScoreGuess,
        status,
        points: bet.points !== null ? bet.points : points,
      };
    });

    return processedBets;
  } catch (error) {
    console.error("ERRO AO BUSCAR PALPITES:", error);
    // Retorna lista vazia em caso de erro para não travar a tela
    return [];
  }
});

// ============================================
// SERVIDOR
// ============================================

const PORT = process.env.ADMIN_PORT || 3334;

app.listen({ port: Number(PORT), host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🎛️  Painel Admin rodando em ${address}`);
});
