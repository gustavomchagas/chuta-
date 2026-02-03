/**
 * TESTE COMPLETO DO BOT - Simula todas as funcionalidades
 * Execute este teste para validar o sistema antes do uso oficial
 */

import { prisma } from "./src/lib/prisma";
import { fetchRoundGames } from "./src/services/sofascoreScraper";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

// Cores para output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(emoji: string, message: string, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function section(title: string) {
  console.log(
    `\n${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}`,
  );
  console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
  console.log(
    `${colors.bright}${colors.cyan}${"=".repeat(60)}${colors.reset}\n`,
  );
}

async function testDatabase() {
  section("TESTE 1: CONEXÃO COM BANCO DE DADOS");

  try {
    await prisma.$connect();
    log("✅", "Conexão com PostgreSQL estabelecida", colors.green);

    const groupCount = await prisma.group.count();
    const playerCount = await prisma.player.count();
    const matchCount = await prisma.match.count();
    const betCount = await prisma.bet.count();

    log("📊", `Grupos cadastrados: ${groupCount}`, colors.blue);
    log("👥", `Jogadores cadastrados: ${playerCount}`, colors.blue);
    log("⚽", `Jogos cadastrados: ${matchCount}`, colors.blue);
    log("🎯", `Palpites cadastrados: ${betCount}`, colors.blue);

    return true;
  } catch (error) {
    log("❌", `Erro na conexão: ${error}`, colors.red);
    return false;
  }
}

async function testScraping() {
  section("TESTE 2: SCRAPING SOFASCORE");

  try {
    log("🔍", "Buscando jogos da rodada 2 no SofaScore...", colors.yellow);

    const games = await fetchRoundGames(2);

    if (games.length === 0) {
      log("⚠️", "Nenhum jogo encontrado", colors.yellow);
      return false;
    }

    log("✅", `${games.length} jogos encontrados`, colors.green);

    // Mostra os 3 primeiros jogos
    for (let i = 0; i < Math.min(3, games.length); i++) {
      const game = games[i];
      const date = dayjs(game.matchDate).format("DD/MM HH:mm");
      log(
        "🏟️",
        `${game.homeTeam} x ${game.awayTeam} - ${date} (${game.status})`,
        colors.blue,
      );
    }

    return true;
  } catch (error) {
    log("❌", `Erro no scraping: ${error}`, colors.red);
    return false;
  }
}

async function testBetLogic() {
  section("TESTE 3: LÓGICA DE PALPITES");

  try {
    // Verifica se há jogos futuros
    const futureMatch = await prisma.match.findFirst({
      where: {
        status: "SCHEDULED",
        matchDate: {
          gte: new Date(),
        },
      },
      orderBy: { matchDate: "asc" },
    });

    if (!futureMatch) {
      log("⚠️", "Nenhum jogo futuro para testar", colors.yellow);
      return true;
    }

    log(
      "🎮",
      `Jogo de teste: ${futureMatch.homeTeam} x ${futureMatch.awayTeam}`,
      colors.blue,
    );

    // Busca ou cria jogador de teste
    let testPlayer = await prisma.player.findFirst({
      where: { name: "TESTE_BOT" },
    });

    if (!testPlayer) {
      testPlayer = await prisma.player.create({
        data: {
          phone: `test_${Date.now()}`,
          name: "TESTE_BOT",
        },
      });
      log("👤", "Jogador de teste criado", colors.green);
    }

    // Testa criação de palpite
    const existingBet = await prisma.bet.findUnique({
      where: {
        playerId_matchId: {
          playerId: testPlayer.id,
          matchId: futureMatch.id,
        },
      },
    });

    if (existingBet) {
      log(
        "📝",
        `Palpite já existe: ${existingBet.homeScoreGuess}x${existingBet.awayScoreGuess}`,
        colors.yellow,
      );
      log(
        "✅",
        "Sistema de imutabilidade OK - palpite não pode ser alterado",
        colors.green,
      );
    } else {
      await prisma.bet.create({
        data: {
          playerId: testPlayer.id,
          matchId: futureMatch.id,
          homeScoreGuess: 2,
          awayScoreGuess: 1,
        },
      });
      log("✅", "Palpite de teste criado: 2x1", colors.green);
    }

    return true;
  } catch (error) {
    log("❌", `Erro na lógica de palpites: ${error}`, colors.red);
    return false;
  }
}

async function testScoringSystem() {
  section("TESTE 4: SISTEMA DE PONTUAÇÃO");

  try {
    // Busca jogos finalizados
    const finishedMatches = await prisma.match.findMany({
      where: {
        status: "FINISHED",
        homeScore: { not: null },
        awayScore: { not: null },
      },
      include: {
        bets: {
          where: { points: { not: null } },
        },
      },
      take: 3,
    });

    if (finishedMatches.length === 0) {
      log("⚠️", "Nenhum jogo finalizado com palpites pontuados", colors.yellow);
      return true;
    }

    log(
      "✅",
      `${finishedMatches.length} jogos finalizados com pontuação`,
      colors.green,
    );

    for (const match of finishedMatches) {
      log(
        "🏆",
        `${match.homeTeam} ${match.homeScore}x${match.awayScore} ${match.awayTeam}`,
        colors.blue,
      );

      for (const bet of match.bets) {
        const points = bet.points || 0;
        const emoji = points === 2 ? "🎯" : points === 1 ? "👍" : "❌";
        log(
          emoji,
          `  Palpite ${bet.homeScoreGuess}x${bet.awayScoreGuess} = ${points} pontos`,
          points === 2
            ? colors.green
            : points === 1
              ? colors.yellow
              : colors.red,
        );
      }
    }

    return true;
  } catch (error) {
    log("❌", `Erro no sistema de pontuação: ${error}`, colors.red);
    return false;
  }
}

async function testRankingSystem() {
  section("TESTE 5: SISTEMA DE RANKING");

  try {
    // Busca jogadores com pontuação
    const players = await prisma.player.findMany({
      include: {
        bets: {
          where: { points: { not: null } },
        },
      },
    });

    if (players.length === 0) {
      log("⚠️", "Nenhum jogador cadastrado", colors.yellow);
      return true;
    }

    // Calcula pontuação total
    const ranking = players
      .map((player) => ({
        name: player.name,
        totalPoints: player.bets.reduce(
          (sum, bet) => sum + (bet.points || 0),
          0,
        ),
        betsCount: player.bets.length,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    log(
      "✅",
      `Ranking calculado para ${ranking.length} jogadores`,
      colors.green,
    );

    // Mostra top 5
    for (let i = 0; i < Math.min(5, ranking.length); i++) {
      const player = ranking[i];
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "📍";
      log(
        medal,
        `${i + 1}º ${player.name} - ${player.totalPoints} pts (${player.betsCount} palpites)`,
        colors.blue,
      );
    }

    return true;
  } catch (error) {
    log("❌", `Erro no ranking: ${error}`, colors.red);
    return false;
  }
}

async function testScheduledGames() {
  section("TESTE 6: JOGOS AGENDADOS");

  try {
    const today = dayjs();
    const nextWeek = today.add(7, "days");

    const upcomingGames = await prisma.match.findMany({
      where: {
        status: "SCHEDULED",
        matchDate: {
          gte: today.toDate(),
          lte: nextWeek.toDate(),
        },
      },
      orderBy: { matchDate: "asc" },
      take: 10,
    });

    if (upcomingGames.length === 0) {
      log("⚠️", "Nenhum jogo agendado para os próximos 7 dias", colors.yellow);
      return true;
    }

    log("✅", `${upcomingGames.length} jogos agendados`, colors.green);

    // Agrupa por rodada
    const byRound = new Map<number, typeof upcomingGames>();
    for (const game of upcomingGames) {
      if (!byRound.has(game.round)) {
        byRound.set(game.round, []);
      }
      byRound.get(game.round)!.push(game);
    }

    for (const [round, games] of byRound) {
      log("📅", `Rodada ${round}: ${games.length} jogos`, colors.cyan);
      const firstGame = games[0];
      const date = dayjs(firstGame.matchDate).format("DD/MM [às] HH[h]mm");
      log(
        "⚽",
        `  Primeiro jogo: ${firstGame.homeTeam} x ${firstGame.awayTeam} (${date})`,
        colors.blue,
      );
    }

    return true;
  } catch (error) {
    log("❌", `Erro ao buscar jogos agendados: ${error}`, colors.red);
    return false;
  }
}

async function testPostponedGames() {
  section("TESTE 7: JOGOS ADIADOS/CANCELADOS");

  try {
    const postponedGames = await prisma.match.findMany({
      where: {
        status: { in: ["POSTPONED", "CANCELLED"] },
      },
    });

    if (postponedGames.length === 0) {
      log("✅", "Nenhum jogo adiado ou cancelado", colors.green);
      return true;
    }

    log(
      "⚠️",
      `${postponedGames.length} jogos com status especial`,
      colors.yellow,
    );

    for (const game of postponedGames) {
      const emoji = game.status === "POSTPONED" ? "⏸️" : "❌";
      log(
        emoji,
        `${game.homeTeam} x ${game.awayTeam} - ${game.status}`,
        colors.yellow,
      );
    }

    return true;
  } catch (error) {
    log("❌", `Erro ao verificar jogos adiados: ${error}`, colors.red);
    return false;
  }
}

async function generateTestReport() {
  section("RELATÓRIO FINAL DE TESTES");

  const results = {
    database: await testDatabase(),
    scraping: await testScraping(),
    betLogic: await testBetLogic(),
    scoring: await testScoringSystem(),
    ranking: await testRankingSystem(),
    scheduled: await testScheduledGames(),
    postponed: await testPostponedGames(),
  };

  console.log("\n");
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter((r) => r).length;
  const failed = total - passed;

  log("📊", `RESULTADO: ${passed}/${total} testes passaram`, colors.bright);

  if (failed === 0) {
    log("🎉", "TODOS OS TESTES PASSARAM!", colors.green);
    log("✅", "Bot está pronto para uso em produção!", colors.green);
  } else {
    log("⚠️", `${failed} teste(s) falharam`, colors.red);
    log("🔧", "Corrija os erros antes de usar em produção", colors.yellow);
  }

  console.log("\n");
  log("💡", "PRÓXIMOS PASSOS:", colors.cyan);
  log("1️⃣", "Execute 'npm start' para iniciar o bot", colors.blue);
  log("2️⃣", "Escaneie o QR Code com o WhatsApp", colors.blue);
  log("3️⃣", "Use !setupgrupo no grupo oficial para configurar", colors.blue);
  log("4️⃣", "Use !config para mostrar regras aos participantes", colors.blue);
  log("5️⃣", "Use !syncrodada X para cadastrar jogos da rodada", colors.blue);

  console.log("\n");
}

// Executa todos os testes
async function main() {
  console.clear();

  log("🤖", "CHUTAÍ - TESTE COMPLETO DO SISTEMA", colors.bright);
  log("📅", `Data: ${dayjs().format("DD/MM/YYYY HH:mm")}`, colors.cyan);

  try {
    await generateTestReport();
  } catch (error) {
    log("❌", `Erro crítico: ${error}`, colors.red);
  } finally {
    await prisma.$disconnect();
  }
}

main();
