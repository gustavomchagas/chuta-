import "dotenv/config";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import path from "path";
import { prisma } from "../lib/prisma";
import { parseBets } from "../utils/betParser";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

const AUTH_FOLDER = path.join(__dirname, "../../auth_info_baileys");

let sock: WASocket | null = null;

// ID do grupo do bolão (será configurado)
let BOLAO_GROUP_ID: string | null = null;

/**
 * Inicializa o bot do WhatsApp
 */
export async function initBot() {
  console.log("🤖 Iniciando Bot do Chutaí...\n");

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ["Chutaí Bot", "Safari", "3.0"],
    syncFullHistory: false,
  });

  // QR Code
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n");
      qrcode.generate(qr, { small: true });
      console.log("\n");
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("❌ Conexão fechada:", lastDisconnect?.error);
      if (shouldReconnect) {
        console.log("🔄 Reconectando...");
        initBot();
      }
    } else if (connection === "open") {
      console.log("✅ Bot conectado ao WhatsApp!");
      console.log("\n📋 Comandos disponíveis:");
      console.log(
        "   !config             - Configura o grupo atual como bolão",
      );
      console.log("   !jogos              - Envia jogos da rodada atual");
      console.log("   !ranking            - Mostra ranking atual");
      console.log("   !faltam             - Mostra quem ainda não palpitou");
      console.log("   !ajuda              - Lista de comandos");

      // Carrega configuração do grupo
      await loadGroupConfig();

      // Inicia scheduler de notificações matinais
      startMorningNotificationScheduler();
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Processa mensagens recebidas
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      await processMessage(msg);
    }
  });
}

/**
 * Carrega configuração do grupo do banco
 */
async function loadGroupConfig() {
  const config = await prisma.group.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (config?.whatsappGroupId) {
    BOLAO_GROUP_ID = config.whatsappGroupId;
    console.log(`📍 Grupo configurado: ${BOLAO_GROUP_ID}`);
  }
}

// Flag para permitir testar com o próprio número (modo desenvolvimento)
const ALLOW_SELF_MESSAGES = true;

/**
 * Processa uma mensagem recebida
 */
async function processMessage(msg: proto.IWebMessageInfo) {
  if (!sock) return;
  if (!msg.key || !msg.message || !msg.key.remoteJid) return;

  // Em produção, ignora mensagens próprias. Em dev, permite para testes.
  if (msg.key.fromMe && !ALLOW_SELF_MESSAGES) return;

  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const senderId = isGroup ? msg.key.participant : chatId;
  const senderPhone =
    senderId?.replace("@s.whatsapp.net", "").replace("@c.us", "") || "";

  // Extrai texto da mensagem
  const text =
    msg.message.conversation || msg.message.extendedTextMessage?.text || "";

  if (!text.trim()) return;

  console.log(`📩 Mensagem de ${senderPhone}: ${text.substring(0, 50)}...`);

  // Comandos (funcionam em qualquer chat)
  if (text.startsWith("!")) {
    await handleCommand(chatId, senderId || "", text.trim().toLowerCase());
    return;
  }

  // Palpites só no grupo configurado
  if (isGroup && chatId === BOLAO_GROUP_ID) {
    await handlePossibleBet(chatId, senderPhone, text, msg);
  }
}

/**
 * Processa comandos
 */
async function handleCommand(
  chatId: string,
  senderId: string,
  command: string,
) {
  if (!sock) return;

  const parts = command.split(" ");
  const cmd = parts[0];
  const arg = parts[1];

  switch (cmd) {
    case "!config":
      if (chatId.endsWith("@g.us")) {
        // Configura o grupo atual
        BOLAO_GROUP_ID = chatId;

        // Cria ou atualiza o grupo no banco
        const existing = await prisma.group.findFirst({
          where: { whatsappGroupId: chatId },
        });
        if (existing) {
          await prisma.group.update({
            where: { id: existing.id },
            data: { isActive: true },
          });
        } else {
          await prisma.group.create({
            data: {
              name: "Bolão WhatsApp",
              whatsappGroupId: chatId,
              isActive: true,
            },
          });
        }

        await sock.sendMessage(chatId, {
          text: "✅ Este grupo foi configurado como o grupo do bolão!",
        });
      }
      break;

    case "!jogos":
      await sendRoundMatches(chatId);
      break;

    case "!rodada":
      // !rodada = pontuação parcial da rodada atual
      // !rodada X = pontuação da rodada X
      if (arg) {
        const roundNum = parseInt(arg);
        if (!isNaN(roundNum)) {
          await sendRoundRanking(chatId, roundNum);
        }
      } else {
        await sendCurrentRoundStatus(chatId);
      }
      break;

    case "!ranking":
    case "!classificacao":
    case "!classificação":
      // !ranking = ranking geral
      // !ranking X = ranking da rodada X
      if (arg) {
        const roundNum = parseInt(arg);
        if (!isNaN(roundNum)) {
          await sendRoundRanking(chatId, roundNum);
        }
      } else {
        await sendRanking(chatId);
      }
      break;

    case "!faltam":
    case "!pendentes":
      await sendPendingBets(chatId);
      break;

    case "!palpites":
      await sendAllBets(chatId);
      break;

    case "!meuspalpites":
    case "!meus":
      await sendUserBets(chatId, senderId);
      break;

    case "!ajuda":
    case "!help":
    case "!comandos":
      await sendHelp(chatId);
      break;
  }
}

/**
 * Tenta identificar e processar um palpite
 */
async function handlePossibleBet(
  chatId: string,
  senderPhone: string,
  text: string,
  msg: proto.IWebMessageInfo,
) {
  if (!sock) return;

  // Busca jogos da rodada atual (agendados ou do dia)
  const today = dayjs().startOf("day").toDate();
  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      matchDate: { gte: today },
    },
    orderBy: [{ round: "asc" }, { matchDate: "asc" }],
    take: 10, // Máximo de jogos por rodada
  });

  if (matches.length === 0) return; // Sem jogos para palpitar

  // Converte para o formato do parser
  type MatchType = (typeof matches)[number];
  const roundMatches = matches.map((m: MatchType, index: number) => ({
    id: m.id,
    number: index + 1, // Número sequencial na rodada
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
  }));

  // Tenta parsear os palpites
  const parseResult = parseBets(text, roundMatches);

  if (!parseResult.success) return; // Não parece ser um palpite

  // Busca ou cria o jogador pelo telefone
  let player = await prisma.player.findUnique({
    where: { phone: senderPhone },
  });

  if (!player) {
    // Tenta pegar o nome do contato
    const pushName = msg.pushName || `Jogador ${senderPhone.slice(-4)}`;
    player = await prisma.player.create({
      data: {
        phone: senderPhone,
        name: pushName,
      },
    });
    console.log(`👤 Novo jogador cadastrado: ${player.name}`);
  }

  // Salva os palpites
  const savedBets: string[] = [];
  const errors: string[] = [];

  for (const bet of parseResult.bets) {
    try {
      // Verifica se ainda dá tempo de palpitar
      const match = matches.find((m: MatchType) => m.id === bet.matchId);
      if (!match) continue;

      if (dayjs().isAfter(dayjs(match.matchDate))) {
        errors.push(`${bet.homeTeam} x ${bet.awayTeam} já começou!`);
        continue;
      }

      // Upsert do palpite
      await prisma.bet.upsert({
        where: {
          playerId_matchId: {
            playerId: player.id,
            matchId: bet.matchId,
          },
        },
        update: {
          homeScoreGuess: bet.homeScore,
          awayScoreGuess: bet.awayScore,
        },
        create: {
          playerId: player.id,
          matchId: bet.matchId,
          homeScoreGuess: bet.homeScore,
          awayScoreGuess: bet.awayScore,
        },
      });

      savedBets.push(
        `${bet.matchNumber}) ${bet.homeTeam} ${bet.homeScore}x${bet.awayScore} ${bet.awayTeam}`,
      );
    } catch (error) {
      console.error("Erro ao salvar palpite:", error);
    }
  }

  // Resposta de confirmação
  if (savedBets.length > 0) {
    let response = `✅ *Palpites de ${player.name} registrados!*\n\n`;
    response += savedBets.join("\n");

    if (errors.length > 0) {
      response += `\n\n⚠️ *Não registrados:*\n${errors.join("\n")}`;
    }

    if (parseResult.suggestions.length > 0) {
      response += `\n\n💡 ${parseResult.suggestions.join("\n")}`;
    }

    await sock.sendMessage(chatId, { text: response });
  }
}

/**
 * Envia os jogos da rodada atual
 */
async function sendRoundMatches(chatId: string) {
  if (!sock) return;

  const today = dayjs().startOf("day").toDate();
  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      matchDate: { gte: today },
    },
    orderBy: [{ round: "asc" }, { matchDate: "asc" }],
    take: 10,
  });

  if (matches.length === 0) {
    await sock.sendMessage(chatId, {
      text: "📭 Não há jogos agendados no momento.",
    });
    return;
  }

  const round = matches[0].round;
  let message = `⚽ *RODADA ${round} - BRASILEIRÃO 2026*\n\n`;

  // Agrupa por data
  const byDate = new Map<string, typeof matches>();
  for (const match of matches) {
    const dateKey = dayjs(match.matchDate).format("YYYY-MM-DD");
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey)!.push(match);
  }

  let matchNumber = 1;
  for (const [dateKey, dateMatches] of byDate) {
    const dateLabel = dayjs(dateKey)
      .format("dddd, DD/MM")
      .replace(/^\w/, (c) => c.toUpperCase());
    message += `📅 *${dateLabel}*\n`;

    for (const match of dateMatches) {
      const time = dayjs(match.matchDate).format("HH[h]mm");
      message += `${matchNumber}️⃣ ${match.homeTeam} x ${match.awayTeam} (${time})\n`;
      matchNumber++;
    }
    message += "\n";
  }

  message += `---\n`;
  message += `📝 *Como palpitar:*\n`;
  message += `Envie todos os palpites de uma vez só!\n\n`;

  // Gera exemplo com os times reais da rodada
  message += `*Exemplo:*\n`;
  let exampleNumber = 1;
  for (const [, dateMatches] of byDate) {
    for (const match of dateMatches) {
      const homeScore = Math.floor(Math.random() * 3);
      const awayScore = Math.floor(Math.random() * 3);
      message += `${match.homeTeam} ${homeScore} x ${awayScore} ${match.awayTeam}\n`;
      exampleNumber++;
    }
  }

  message += `\n💡 _Copie, altere os placares e envie!_`;

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Envia o ranking atual
 */
async function sendRanking(chatId: string) {
  if (!sock) return;

  const players = await prisma.player.findMany({
    include: {
      bets: {
        where: { points: { not: null } },
        select: { points: true },
      },
    },
  });

  interface RankedPlayer {
    name: string;
    totalPoints: number;
    totalBets: number;
    exactScores: number;
  }

  type PlayerType = (typeof players)[number];
  const ranking: RankedPlayer[] = players
    .map((player: PlayerType) => ({
      name: player.name,
      totalPoints: player.bets.reduce(
        (sum: number, bet: { points: number | null }) =>
          sum + (bet.points || 0),
        0,
      ),
      totalBets: player.bets.length,
      exactScores: player.bets.filter(
        (b: { points: number | null }) => b.points === 2,
      ).length,
    }))
    .filter((p: RankedPlayer) => p.totalBets > 0)
    .sort((a: RankedPlayer, b: RankedPlayer) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.exactScores - a.exactScores;
    });

  if (ranking.length === 0) {
    await sock.sendMessage(chatId, {
      text: "📊 Nenhum palpite computado ainda!",
    });
    return;
  }

  let message = "🏆 *RANKING DO BOLÃO*\n\n";

  const medals = ["🥇", "🥈", "🥉"];
  ranking.forEach((player, index) => {
    const medal = medals[index] || `${index + 1}.`;
    message += `${medal} *${player.name}*\n`;
    message += `   ${player.totalPoints} pts | ${player.totalBets} jogos | ${player.exactScores} cravadas\n\n`;
  });

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Envia ranking de uma rodada específica
 */
async function sendRoundRanking(chatId: string, roundNumber: number) {
  if (!sock) return;

  // Busca jogos da rodada
  const matches = await prisma.match.findMany({
    where: { round: roundNumber },
    include: {
      bets: {
        include: { player: true },
      },
    },
  });

  if (matches.length === 0) {
    await sock.sendMessage(chatId, {
      text: `📭 Rodada ${roundNumber} não encontrada.`,
    });
    return;
  }

  // Conta jogos finalizados
  const finishedMatches = matches.filter((m) => m.status === "FINISHED");
  const isComplete = finishedMatches.length === matches.length;

  // Agrupa pontos por jogador
  interface PlayerRoundStats {
    name: string;
    points: number;
    bets: number;
    exactScores: number;
  }

  const playerStats = new Map<string, PlayerRoundStats>();

  for (const match of matches) {
    for (const bet of match.bets) {
      const existing = playerStats.get(bet.playerId) || {
        name: bet.player.name,
        points: 0,
        bets: 0,
        exactScores: 0,
      };

      existing.bets++;
      if (bet.points !== null) {
        existing.points += bet.points;
        if (bet.points === 2) existing.exactScores++;
      }

      playerStats.set(bet.playerId, existing);
    }
  }

  const ranking = Array.from(playerStats.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.exactScores - a.exactScores;
  });

  if (ranking.length === 0) {
    await sock.sendMessage(chatId, {
      text: `📭 Nenhum palpite na rodada ${roundNumber}.`,
    });
    return;
  }

  const statusText = isComplete
    ? "✅ ENCERRADA"
    : `⏳ ${finishedMatches.length}/${matches.length} jogos`;

  let message = `🏆 *RANKING RODADA ${roundNumber}* (${statusText})\n\n`;

  const medals = ["🥇", "🥈", "🥉"];
  ranking.forEach((player, index) => {
    const medal = medals[index] || `${index + 1}.`;
    message += `${medal} *${player.name}*\n`;
    message += `   ${player.points} pts | ${player.exactScores} cravadas\n\n`;
  });

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Envia status da rodada atual com pontuação parcial
 */
async function sendCurrentRoundStatus(chatId: string) {
  if (!sock) return;

  // Busca a rodada atual (menor rodada com jogos não finalizados)
  const currentRoundMatch = await prisma.match.findFirst({
    where: {
      status: { in: ["SCHEDULED", "LIVE"] },
    },
    orderBy: { round: "asc" },
  });

  if (!currentRoundMatch) {
    // Se não há jogos pendentes, pega a última rodada
    const lastMatch = await prisma.match.findFirst({
      orderBy: { round: "desc" },
    });

    if (!lastMatch) {
      await sock.sendMessage(chatId, {
        text: "📭 Nenhuma rodada cadastrada.",
      });
      return;
    }

    await sendRoundRanking(chatId, lastMatch.round);
    return;
  }

  const currentRound = currentRoundMatch.round;

  // Busca todos os jogos da rodada
  const matches = await prisma.match.findMany({
    where: { round: currentRound },
    include: {
      bets: {
        include: { player: true },
      },
    },
    orderBy: { matchDate: "asc" },
  });

  const finishedMatches = matches.filter((m) => m.status === "FINISHED");
  const scheduledMatches = matches.filter((m) => m.status === "SCHEDULED");

  // Calcula pontuação parcial
  interface PlayerRoundStats {
    name: string;
    points: number;
    exactScores: number;
    pendingBets: number;
  }

  const playerStats = new Map<string, PlayerRoundStats>();

  for (const match of matches) {
    for (const bet of match.bets) {
      const existing = playerStats.get(bet.playerId) || {
        name: bet.player.name,
        points: 0,
        exactScores: 0,
        pendingBets: 0,
      };

      if (match.status === "FINISHED" && bet.points !== null) {
        existing.points += bet.points;
        if (bet.points === 2) existing.exactScores++;
      } else if (match.status === "SCHEDULED") {
        existing.pendingBets++;
      }

      playerStats.set(bet.playerId, existing);
    }
  }

  const ranking = Array.from(playerStats.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.exactScores - a.exactScores;
  });

  let message = `⚽ *RODADA ${currentRound} - PARCIAL*\n`;
  message += `📊 ${finishedMatches.length}/${matches.length} jogos finalizados\n\n`;

  // Mostra resultados dos jogos finalizados
  if (finishedMatches.length > 0) {
    message += `*Resultados:*\n`;
    for (const match of finishedMatches) {
      message += `✅ ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}\n`;
    }
    message += `\n`;
  }

  // Mostra jogos pendentes
  if (scheduledMatches.length > 0) {
    message += `*Ainda vão jogar:*\n`;
    for (const match of scheduledMatches) {
      const time = dayjs(match.matchDate).format("DD/MM HH[h]mm");
      message += `⏳ ${match.homeTeam} x ${match.awayTeam} (${time})\n`;
    }
    message += `\n`;
  }

  // Mostra ranking parcial
  if (ranking.length > 0 && finishedMatches.length > 0) {
    message += `*Ranking parcial:*\n`;
    const medals = ["🥇", "🥈", "🥉"];
    ranking.slice(0, 10).forEach((player, index) => {
      const medal = medals[index] || `${index + 1}.`;
      const pendingText =
        player.pendingBets > 0 ? ` (+${player.pendingBets} jogos)` : "";
      message += `${medal} ${player.name}: ${player.points} pts${pendingText}\n`;
    });
  }

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Envia lista de quem falta palpitar
 */
async function sendPendingBets(chatId: string) {
  if (!sock) return;

  const today = dayjs().startOf("day").toDate();
  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      matchDate: { gte: today },
    },
    include: {
      bets: {
        select: { playerId: true },
      },
    },
  });

  if (matches.length === 0) {
    await sock.sendMessage(chatId, {
      text: "📭 Não há jogos agendados no momento.",
    });
    return;
  }

  const allPlayers = await prisma.player.findMany();

  type MatchWithBets = (typeof matches)[number];
  type BetType = MatchWithBets["bets"][number];
  type PlayerType = (typeof allPlayers)[number];
  const playersWhoBet = new Set(
    matches.flatMap((m: MatchWithBets) =>
      m.bets.map((b: BetType) => b.playerId),
    ),
  );
  const pendingPlayers = allPlayers.filter(
    (p: PlayerType) => !playersWhoBet.has(p.id),
  );

  if (pendingPlayers.length === 0) {
    await sock.sendMessage(chatId, {
      text: "✅ Todos já palpitaram! 🎉",
    });
    return;
  }

  let message = `⏳ *AINDA FALTAM PALPITAR:*\n\n`;
  message += pendingPlayers.map((p: PlayerType) => `• ${p.name}`).join("\n");
  message += `\n\n📝 Enviem seus palpites, galera!`;

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Envia todos os palpites da rodada atual
 */
async function sendAllBets(chatId: string) {
  if (!sock) return;

  const today = dayjs().startOf("day").toDate();
  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      matchDate: { gte: today },
    },
    include: {
      bets: {
        include: {
          player: true,
        },
      },
    },
    orderBy: { matchDate: "asc" },
  });

  if (matches.length === 0) {
    await sock.sendMessage(chatId, {
      text: "📭 Não há jogos agendados no momento.",
    });
    return;
  }

  let message = "📋 *PALPITES DA RODADA*\n\n";

  for (const match of matches) {
    message += `*${match.homeTeam} x ${match.awayTeam}*\n`;

    if (match.bets.length === 0) {
      message += `  _Nenhum palpite ainda_\n`;
    } else {
      for (const bet of match.bets) {
        message += `  • ${bet.player.name}: ${bet.homeScoreGuess}x${bet.awayScoreGuess}\n`;
      }
    }
    message += "\n";
  }

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Envia os palpites de um usuário específico
 */
async function sendUserBets(chatId: string, senderId: string) {
  if (!sock) return;

  const phone = senderId.replace("@s.whatsapp.net", "").replace("@c.us", "");

  const player = await prisma.player.findUnique({
    where: { phone },
    include: {
      bets: {
        include: { match: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!player) {
    await sock.sendMessage(chatId, {
      text: "❓ Você ainda não fez nenhum palpite!",
    });
    return;
  }

  if (player.bets.length === 0) {
    await sock.sendMessage(chatId, {
      text: "📭 Você ainda não tem palpites registrados.",
    });
    return;
  }

  let message = `📝 *Seus últimos palpites, ${player.name}:*\n\n`;

  for (const bet of player.bets) {
    const pointsStr = bet.points !== null ? ` → ${bet.points}pts` : "";
    message += `• ${bet.match.homeTeam} ${bet.homeScoreGuess}x${bet.awayScoreGuess} ${bet.match.awayTeam}${pointsStr}\n`;
  }

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Envia a lista de comandos
 */
async function sendHelp(chatId: string) {
  if (!sock) return;

  const message =
    `🤖 *COMANDOS DO CHUTAÍ*\n\n` +
    `*!jogos* - Ver jogos da rodada\n` +
    `*!ranking* - Ranking geral do bolão\n` +
    `*!ranking X* - Ranking da rodada X\n` +
    `*!rodada* - Status e parcial da rodada atual\n` +
    `*!faltam* - Ver quem falta palpitar\n` +
    `*!palpites* - Ver todos os palpites\n` +
    `*!meus* - Ver seus palpites\n` +
    `*!ajuda* - Ver esta mensagem\n\n` +
    `📝 *Para palpitar:*\n` +
    `Envie todos os palpites de uma vez!\n` +
    `Ex: \`Flamengo 2x1 Vasco\``;

  await sock.sendMessage(chatId, { text: message });
}

// ========================================
// NOTIFICAÇÕES AUTOMÁTICAS
// ========================================

let morningSchedulerRunning = false;
let reminderSchedulerRunning = false;

/**
 * Inicia o scheduler de notificações matinais
 * Envia os jogos do dia automaticamente às 8h da manhã
 */
function startMorningNotificationScheduler() {
  if (morningSchedulerRunning) return;
  morningSchedulerRunning = true;

  console.log("⏰ Scheduler de notificações matinais ativado (8h)");
  console.log(
    "⏰ Scheduler de lembretes ativado (a cada 3h, última 1h antes do jogo)",
  );

  // Verifica a cada minuto se é hora de enviar
  setInterval(async () => {
    const now = dayjs();
    const hour = now.hour();
    const minute = now.minute();

    // Envia às 8:00 da manhã
    if (hour === 8 && minute === 0) {
      await sendMorningNotification();
    }

    // Verifica lembretes a cada 3 horas (8h, 11h, 14h, 17h, 20h)
    // e também 1h antes do primeiro jogo
    if (minute === 0 && [8, 11, 14, 17, 20].includes(hour)) {
      await sendReminderIfNeeded();
    }
  }, 60000); // Verifica a cada 1 minuto

  // Inicia scheduler especial para lembrete 1h antes do jogo
  startOneHourBeforeReminder();

  // Verifica imediatamente se perdemos o horário de hoje
  checkIfShouldSendNow();
}

/**
 * Scheduler especial para enviar lembrete 1h antes do primeiro jogo
 */
function startOneHourBeforeReminder() {
  if (reminderSchedulerRunning) return;
  reminderSchedulerRunning = true;

  // Verifica a cada 5 minutos se está 1h antes de algum jogo
  setInterval(async () => {
    await checkOneHourBeforeGame();
  }, 300000); // A cada 5 minutos

  // Verifica imediatamente
  checkOneHourBeforeGame();
}

/**
 * Verifica se falta 1h para o primeiro jogo e envia lembrete final
 */
async function checkOneHourBeforeGame() {
  if (!sock || !BOLAO_GROUP_ID) return;

  const now = dayjs();
  const oneHourFromNow = now.add(1, "hour");

  // Busca o próximo jogo
  const nextMatch = await prisma.match.findFirst({
    where: {
      status: "SCHEDULED",
      matchDate: { gt: now.toDate() },
    },
    orderBy: { matchDate: "asc" },
  });

  if (!nextMatch) return;

  const matchTime = dayjs(nextMatch.matchDate);
  const diffMinutes = matchTime.diff(now, "minute");

  // Se falta entre 55 e 65 minutos (janela de 10 min para pegar o horário certo)
  if (diffMinutes >= 55 && diffMinutes <= 65) {
    // Verifica se já enviamos esse lembrete
    const reminderKey = `1H_BEFORE_${nextMatch.id}`;
    const alreadySent = await prisma.notification.findFirst({
      where: {
        type: reminderKey,
      },
    });

    if (!alreadySent) {
      await sendFinalReminder(nextMatch.round);
    }
  }
}

/**
 * Envia lembrete final 1h antes do jogo
 */
async function sendFinalReminder(round: number) {
  if (!sock || !BOLAO_GROUP_ID) return;

  // Busca jogos da rodada
  const matches = await prisma.match.findMany({
    where: {
      round,
      status: "SCHEDULED",
    },
    include: {
      bets: { select: { playerId: true } },
    },
    orderBy: { matchDate: "asc" },
  });

  if (matches.length === 0) return;

  const firstMatch = matches[0];

  // Busca quem falta palpitar
  const allPlayers = await prisma.player.findMany();
  const playersWhoBet = new Set(
    matches.flatMap((m) => m.bets.map((b) => b.playerId)),
  );
  const pendingPlayers = allPlayers.filter((p) => !playersWhoBet.has(p.id));

  if (pendingPlayers.length === 0) return; // Todos já palpitaram

  let message = `🚨 *ÚLTIMA CHAMADA!* 🚨\n\n`;
  message += `⏰ Falta *1 HORA* para começar:\n`;
  message += `🏟️ ${firstMatch.homeTeam} x ${firstMatch.awayTeam}\n\n`;
  message += `📋 *Ainda faltam palpitar:*\n`;
  message += pendingPlayers.map((p) => `• ${p.name}`).join("\n");
  message += `\n\n⚠️ _Corram que ainda dá tempo!_`;

  await sock.sendMessage(BOLAO_GROUP_ID, { text: message });

  // Registra que enviamos
  await prisma.notification.create({
    data: {
      type: `1H_BEFORE_${firstMatch.id}`,
      sentAt: new Date(),
      groupId: BOLAO_GROUP_ID,
    },
  });

  console.log(`✅ Lembrete final (1h antes) enviado para rodada ${round}`);
}

/**
 * Envia lembrete se ainda há pessoas que não palpitaram
 */
async function sendReminderIfNeeded() {
  if (!sock || !BOLAO_GROUP_ID) return;

  const now = dayjs();
  const todayStart = now.startOf("day").toDate();
  const todayEnd = now.endOf("day").toDate();

  // Busca jogos de hoje ainda não começados
  const matchesToday = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      matchDate: {
        gte: now.toDate(), // Apenas jogos que ainda não começaram
        lte: todayEnd,
      },
    },
    include: {
      bets: { select: { playerId: true } },
    },
    orderBy: { matchDate: "asc" },
  });

  if (matchesToday.length === 0) return;

  // Busca quem falta palpitar
  const allPlayers = await prisma.player.findMany();
  const playersWhoBet = new Set(
    matchesToday.flatMap((m) => m.bets.map((b) => b.playerId)),
  );
  const pendingPlayers = allPlayers.filter((p) => !playersWhoBet.has(p.id));

  if (pendingPlayers.length === 0) return; // Todos já palpitaram

  // Verifica se já enviamos lembrete nessa hora
  const hourKey = now.format("YYYY-MM-DD-HH");
  const alreadySent = await prisma.notification.findFirst({
    where: {
      type: `REMINDER_${hourKey}`,
    },
  });

  if (alreadySent) return;

  const firstMatch = matchesToday[0];
  const timeToGame = dayjs(firstMatch.matchDate).diff(now, "hour");

  let message = `⏰ *LEMBRETE DE PALPITES*\n\n`;
  message += `🏟️ Próximo jogo em ~${timeToGame}h:\n`;
  message += `${firstMatch.homeTeam} x ${firstMatch.awayTeam}\n\n`;
  message += `📋 *Ainda faltam palpitar:*\n`;
  message += pendingPlayers.map((p) => `• ${p.name}`).join("\n");
  message += `\n\n📝 _Enviem seus palpites!_`;

  await sock.sendMessage(BOLAO_GROUP_ID, { text: message });

  // Registra que enviamos
  await prisma.notification.create({
    data: {
      type: `REMINDER_${hourKey}`,
      sentAt: new Date(),
      groupId: BOLAO_GROUP_ID,
    },
  });

  console.log(`✅ Lembrete enviado (${pendingPlayers.length} pendentes)`);
}

/**
 * Verifica se deveria ter enviado hoje (útil se o bot reiniciar após as 8h)
 */
async function checkIfShouldSendNow() {
  const now = dayjs();
  const todayKey = now.format("YYYY-MM-DD");

  // Busca se há jogos hoje
  const todayStart = now.startOf("day").toDate();
  const todayEnd = now.endOf("day").toDate();

  const matchesToday = await prisma.match.findFirst({
    where: {
      status: "SCHEDULED",
      matchDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  // Se há jogos hoje e já passou das 8h, verifica se já notificamos
  if (matchesToday && now.hour() >= 8) {
    const lastNotification = await prisma.notification.findFirst({
      where: {
        type: "MORNING_GAMES",
        sentAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Se não notificamos ainda hoje, envia agora
    if (!lastNotification) {
      console.log("📢 Recuperando notificação matinal perdida...");
      await sendMorningNotification();
    }
  }
}

/**
 * Envia notificação matinal com os jogos do dia
 */
async function sendMorningNotification() {
  if (!sock || !BOLAO_GROUP_ID) {
    console.log(
      "⚠️ Não é possível enviar notificação: bot não conectado ou grupo não configurado",
    );
    return;
  }

  const today = dayjs();
  const todayStart = today.startOf("day").toDate();
  const todayEnd = today.endOf("day").toDate();

  // Busca jogos de hoje
  const matchesToday = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      matchDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    orderBy: { matchDate: "asc" },
  });

  if (matchesToday.length === 0) {
    console.log("📭 Sem jogos hoje, notificação não enviada");
    return;
  }

  // Verifica se já enviamos hoje (evita duplicatas)
  const alreadySent = await prisma.notification.findFirst({
    where: {
      type: "MORNING_GAMES",
      sentAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  if (alreadySent) {
    console.log("📭 Notificação matinal já foi enviada hoje");
    return;
  }

  // Monta a mensagem
  const round = matchesToday[0].round;
  let message = `☀️ *BOM DIA, BOLEIROS!*\n\n`;
  message += `⚽ *JOGOS DE HOJE - RODADA ${round}*\n\n`;

  for (const match of matchesToday) {
    const time = dayjs(match.matchDate).format("HH[h]mm");
    message += `🏟️ ${match.homeTeam} x ${match.awayTeam} (${time})\n`;
  }

  message += `\n📝 *Enviem seus palpites!*\n`;
  message += `_Lembrando: palpite só vale se enviado ANTES do jogo começar!_\n\n`;

  // Gera exemplo com os times do dia
  message += `*Exemplo de palpite:*\n`;
  for (const match of matchesToday) {
    const homeScore = Math.floor(Math.random() * 3);
    const awayScore = Math.floor(Math.random() * 3);
    message += `${match.homeTeam} ${homeScore} x ${awayScore} ${match.awayTeam}\n`;
  }

  message += `\n💡 _Copie, altere os placares e envie aqui!_`;

  // Envia a mensagem
  await sock.sendMessage(BOLAO_GROUP_ID, { text: message });

  // Registra que enviamos a notificação
  await prisma.notification.create({
    data: {
      type: "MORNING_GAMES",
      sentAt: new Date(),
      groupId: BOLAO_GROUP_ID,
    },
  });

  console.log(`✅ Notificação matinal enviada para ${BOLAO_GROUP_ID}`);
}
