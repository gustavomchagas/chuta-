import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "path";
import fs from "fs";
import { prisma } from "./lib/prisma";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

const app = Fastify({ logger: true });

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

  return { ...match, betsUpdated: bets.length };
});

// Deleta um jogo
app.delete("/api/matches/:id", async (request) => {
  const { id } = request.params as { id: string };
  await prisma.match.delete({ where: { id } });
  return { success: true };
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
  const { homeScore, awayScore } = request.body as {
    homeScore: number;
    awayScore: number;
  };

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

  return { ...match, betsUpdated: bets.length };
});

// Deletar jogo (compatibilidade)
app.delete("/api/games/:id", async (request) => {
  const { id } = request.params as { id: string };
  await prisma.match.delete({ where: { id } });
  return { success: true };
});

// Lista todos os jogadores
app.get("/api/players", async () => {
  const players = await prisma.player.findMany({
    include: {
      _count: { select: { bets: true } },
    },
    orderBy: { name: "asc" },
  });
  return players;
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
    .map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      totalPoints: p.bets.reduce((sum: number, b) => sum + (b.points || 0), 0),
      totalBets: p.bets.length,
      exactScores: 0,
      correctWinners: 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return ranking;
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
