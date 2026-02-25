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
import http from "http";
import { prisma } from "../lib/prisma";
import { parseBets } from "../utils/betParser";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("pt-br");
dayjs.tz.setDefault("America/Sao_Paulo");

const AUTH_FOLDER = path.join(__dirname, "../../auth_info_baileys");

let sock: WASocket | null = null;

// ID do grupo do bolão (será configurado)
let BOLAO_GROUP_ID: string | null = null;

/**
 * Obtém o nome de exibição do jogador, adicionando sufixo do telefone
 * quando há outro jogador com o mesmo nome
 */
async function getPlayerDisplayName(
  playerId: string,
  playerName: string,
): Promise<string> {
  try {
    // Busca se há outros jogadores com o mesmo nome
    const playersWithSameName = await prisma.player.findMany({
      where: {
        name: {
          equals: playerName,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        phone: true,
      },
    });

    // Se só tem um jogador com esse nome, retorna o nome normal
    if (playersWithSameName.length <= 1) {
      return playerName;
    }

    // Se há duplicados, adiciona os últimos 3 dígitos do telefone
    const currentPlayer = playersWithSameName.find((p) => p.id === playerId);
    if (!currentPlayer) {
      return playerName;
    }

    const phoneSuffix = currentPlayer.phone.slice(-3);
    return `${playerName} (${phoneSuffix})`;
  } catch (error) {
    console.error("❌ Erro ao buscar nome de exibição:", error);
    return playerName;
  }
}

/**
 * Busca a quantidade de membros do grupo que ainda não palpitaram
 * Retorna apenas a contagem (total membros - quem já palpitou)
 */
async function getPendingMembersCount(matchesToday: any[]): Promise<number> {
  if (!sock || !BOLAO_GROUP_ID) return 0;

  try {
    // Busca metadados do grupo
    const groupMetadata = await sock.groupMetadata(BOLAO_GROUP_ID);
    const members = groupMetadata.participants;

    // Remove o bot da contagem
    const botNumber = "553597756801";
    const totalMembers = members.filter(
      (m) => !m.id.includes(botNumber),
    ).length;

    // Busca jogadores que já palpitaram nos jogos de hoje
    const playerIdsWhoBet = new Set(
      matchesToday.flatMap((m) => m.bets.map((b: any) => b.playerId)),
    );

    // Conta quantos jogadores distintos já palpitaram
    const playersWhoBetCount = playerIdsWhoBet.size;

    const pendingCount = totalMembers - playersWhoBetCount;

    console.log(
      `👥 Grupo tem ${totalMembers} membros (exceto bot), ${playersWhoBetCount} já palpitaram, ${pendingCount} pendentes`,
    );

    return Math.max(0, pendingCount); // Garante que não seja negativo
  } catch (error) {
    console.error("❌ Erro ao buscar membros do grupo:", error);
    return 0;
  }
}

/**
 * Extrai o nome do jogador da mensagem, se houver.
 * Se a primeira linha não contém placar (X x X), considera como nome.
 *
 * Exemplos:
 * - "NEI\nFlamengo 2x1 Vasco" → { playerName: "NEI", betsText: "Flamengo 2x1 Vasco" }
 * - "Flamengo 2x1 Vasco" → { playerName: null, betsText: "Flamengo 2x1 Vasco" }
 */
function extractPlayerNameFromMessage(text: string): {
  playerName: string | null;
  betsText: string;
} {
  const lines = text.trim().split("\n");

  if (lines.length < 2) {
    // Apenas uma linha, não tem nome separado
    return { playerName: null, betsText: text };
  }

  const firstLine = lines[0].trim();

  // Verifica se a primeira linha parece um placar (contém "x" entre números ou nomes de times)
  // Padrões de placar: "2x1", "2 x 1", "Flamengo 2x1", "1) 2x1", etc.
  const scorePattern = /\d+\s*x\s*\d+/i;

  if (scorePattern.test(firstLine)) {
    // Primeira linha é um placar, não tem nome
    return { playerName: null, betsText: text };
  }

  // Verifica se a primeira linha é curta e não contém números (provavelmente um nome)
  // Nomes geralmente têm menos de 30 caracteres e não contêm dígitos de placar
  if (firstLine.length <= 30 && !scorePattern.test(firstLine)) {
    // Considera a primeira linha como nome
    const betsText = lines.slice(1).join("\n");
    return { playerName: firstLine, betsText };
  }

  return { playerName: null, betsText: text };
}

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
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const delay = statusCode === 405 ? 30000 : 5000;
        console.log(`🔄 Reconectando em ${delay / 1000}s...`);
        setTimeout(() => initBot(), delay);
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
      console.log("   !sync               - Sincroniza jogos do SofaScore");
      console.log("   !ajuda              - Lista de comandos");

      // Carrega configuração do grupo
      await loadGroupConfig();

      // Inicia scheduler de notificações matinais
      startMorningNotificationScheduler();

      // Inicia servidor HTTP interno para comunicação com admin
      startInternalHttpServer();
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
    case "!configuracao":
    case "!regras":
    case "!info":
      await sendBotInfo(chatId);
      break;

    case "!setupgrupo":
      // Comando admin para configurar o grupo (mantido separado)
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

        // Busca metadados do grupo para mencionar todos
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants.map((p) => p.id);

        // Monta mensagem com menção a todos
        const mentions = participants;
        const setupMessage =
          `✅ *GRUPO CONFIGURADO COM SUCESSO!* ✅\n\n` +
          `Este grupo agora é o grupo oficial do *BOLÃO BRASILEIRÃO 2026*! 🏆⚽\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `👥 *ATENÇÃO @todos*\n\n` +
          `O bot está ativo e pronto para receber seus palpites!\n\n` +
          `🎯 Digite *!config* para ver todas as regras\n` +
          `🎮 Digite *!ajuda* para ver todos os comandos\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🤖 *BOA SORTE A TODOS!* ⚽`;

        await sock.sendMessage(chatId, {
          text: setupMessage,
          mentions: mentions,
        });

        // Envia as regras completas logo em seguida
        await sendBotInfo(chatId);
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

    case "!resultados":
      // !resultados = resultados da rodada atual
      // !resultados X = resultados da rodada X
      if (arg) {
        const roundNum = parseInt(arg);
        if (!isNaN(roundNum)) {
          await sendResultsMessage(chatId, roundNum);
        }
      } else {
        await sendResultsMessage(chatId);
      }
      break;

    case "!palpites":
      // !palpites = palpites da rodada atual
      // !palpites X = palpites da rodada X
      if (arg) {
        const roundNum = parseInt(arg);
        if (!isNaN(roundNum)) {
          await sendAllBets(chatId, roundNum);
        }
      } else {
        await sendAllBets(chatId);
      }
      break;

    case "!meuspalpites":
    case "!meus":
      await sendUserBets(chatId, senderId);
      break;

    case "!sync":
    // COMANDOS DE SINCRONIZAÇÃO DESATIVADOS - CADASTRO MANUAL VIA PAINEL ADMIN
    // case "!sincronizar":
    // case "!syncrodada":
    // case "!sincronizarrodada":
    // case "!proxima":
    // case "!proximarodada":
    // case "!verificar":
    // case "!verificaradiados":

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

  // Verifica se a mensagem começa com um nome (palpite em nome de outra pessoa)
  const { playerName, betsText } = extractPlayerNameFromMessage(text);

  // Busca jogos da rodada atual
  const today = dayjs().startOf("day").toDate();

  // Busca todos os jogos agendados a partir de hoje
  const allUpcoming = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      matchDate: { gte: today },
    },
    orderBy: { matchDate: "asc" },
  });

  if (allUpcoming.length === 0) return; // Sem jogos para palpitar

  // Determina a rodada atual (a com mais jogos agendados)
  // Isso evita que jogos adiados de rodadas anteriores se misturem
  const roundCounts = new Map<number, number>();
  for (const m of allUpcoming) {
    roundCounts.set(m.round, (roundCounts.get(m.round) || 0) + 1);
  }

  let currentRound = allUpcoming[0].round;
  let maxGameCount = 0;
  for (const [round, count] of roundCounts) {
    if (count > maxGameCount) {
      maxGameCount = count;
      currentRound = round;
    }
  }

  // Filtra apenas os jogos da rodada atual
  const roundOnly = allUpcoming.filter((m) => m.round === currentRound);

  // Filtra jogos adiados (primeiro jogo + 2 dias)
  const firstMatchDate = dayjs(roundOnly[0].matchDate).startOf("day");
  const maxDate = firstMatchDate.add(2, "day").endOf("day");
  const validMatches = roundOnly.filter(
    (m) =>
      dayjs(m.matchDate).isBefore(maxDate) ||
      dayjs(m.matchDate).isSame(maxDate, "day"),
  );

  // Filtra apenas jogos futuros (não iniciados)
  const now = dayjs();
  const matches = validMatches.filter((m) => dayjs(m.matchDate).isAfter(now));

  if (matches.length === 0) return;

  // Converte para o formato do parser
  type MatchType = (typeof matches)[number];
  const roundMatches = matches.map((m: MatchType, index: number) => ({
    id: m.id,
    number: index + 1, // Número sequencial na rodada
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
  }));

  // Tenta parsear os palpites (usa o texto sem o nome, se houver)
  const parseResult = parseBets(betsText, roundMatches);

  if (!parseResult.success) return; // Não parece ser um palpite

  // Determina o jogador
  let player;

  if (playerName) {
    // Palpite em nome de outra pessoa - busca ou cria pelo nome
    player = await prisma.player.findFirst({
      where: {
        name: {
          equals: playerName,
          mode: "insensitive", // Case insensitive
        },
      },
    });

    if (!player) {
      // Cria novo jogador com esse nome (sem telefone, pois não sabemos)
      player = await prisma.player.create({
        data: {
          phone: `ext_${Date.now()}`, // Telefone temporário único
          name: playerName,
        },
      });
      console.log(`👤 Novo jogador cadastrado (por nome): ${player.name}`);
    }
  } else {
    // Palpite normal - busca ou cria pelo telefone
    player = await prisma.player.findUnique({
      where: { phone: senderPhone },
    });

    if (!player) {
      const pushName = msg.pushName || `Jogador ${senderPhone.slice(-4)}`;
      player = await prisma.player.create({
        data: {
          phone: senderPhone,
          name: pushName,
        },
      });
      console.log(`👤 Novo jogador cadastrado: ${player.name}`);
    }
  }

  // Salva os palpites
  const savedBets: string[] = [];
  const errors: string[] = [];
  const alreadyBet: string[] = [];

  for (const bet of parseResult.bets) {
    try {
      // Verifica se ainda dá tempo de palpitar
      const match = matches.find((m: MatchType) => m.id === bet.matchId);
      if (!match) continue;

      if (dayjs().isAfter(dayjs(match.matchDate))) {
        errors.push(`${bet.homeTeam} x ${bet.awayTeam} já começou!`);
        continue;
      }

      // Verifica se já existe palpite para este jogo
      const existingBet = await prisma.bet.findUnique({
        where: {
          playerId_matchId: {
            playerId: player.id,
            matchId: bet.matchId,
          },
        },
      });

      if (existingBet) {
        // Palpite já existe - NÃO PODE ALTERAR
        alreadyBet.push(
          `${bet.matchNumber}) ${bet.homeTeam} x ${bet.awayTeam} (já palpitado: ${existingBet.homeScoreGuess}x${existingBet.awayScoreGuess})`,
        );
        continue;
      }

      // Cria novo palpite (apenas create, sem update)
      await prisma.bet.create({
        data: {
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
  if (savedBets.length > 0 || alreadyBet.length > 0 || errors.length > 0) {
    let response = "";

    // Obtém nome de exibição com diferenciação se necessário
    const displayName = await getPlayerDisplayName(player.id, player.name);

    if (savedBets.length > 0) {
      response += `✅ *Palpites de ${displayName} registrados!*\n\n`;
      response += savedBets.join("\n");
      response += `\n\n⚠️ *ATENÇÃO: Palpites não podem ser alterados!*`;
    }

    if (alreadyBet.length > 0) {
      if (response) response += "\n\n";
      response += `🚫 *Palpites já registrados (não alterados):*\n`;
      response += alreadyBet.join("\n");
      response += `\n\n_Palpites são definitivos e não podem ser modificados._`;
    }

    if (errors.length > 0) {
      if (response) response += "\n\n";
      response += `⚠️ *Não registrados:*\n${errors.join("\n")}`;
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

  // Busca todos os jogos agendados a partir de hoje
  const allUpcoming = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      matchDate: { gte: today },
    },
    orderBy: { matchDate: "asc" },
  });

  if (allUpcoming.length === 0) {
    await sock.sendMessage(chatId, {
      text: "📭 Não há jogos agendados no momento.",
    });
    return;
  }

  // Determina a rodada atual (a com mais jogos agendados)
  const roundCounts = new Map<number, number>();
  for (const m of allUpcoming) {
    roundCounts.set(m.round, (roundCounts.get(m.round) || 0) + 1);
  }

  let round = allUpcoming[0].round;
  let maxGameCount = 0;
  for (const [r, count] of roundCounts) {
    if (count > maxGameCount) {
      maxGameCount = count;
      round = r;
    }
  }

  // Filtra apenas os jogos da rodada atual
  const roundOnly = allUpcoming.filter((m) => m.round === round);

  // Filtra jogos adiados (primeiro jogo + 2 dias)
  const firstMatchDate = dayjs(roundOnly[0].matchDate).startOf("day");
  const maxDate = firstMatchDate.add(2, "day").endOf("day");
  const filteredMatches = roundOnly.filter(
    (m) =>
      dayjs(m.matchDate).isBefore(maxDate) ||
      dayjs(m.matchDate).isSame(maxDate, "day"),
  );

  if (filteredMatches.length === 0) {
    await sock.sendMessage(chatId, {
      text: `⏰ Os jogos da rodada ${round} ainda não estão disponíveis para palpites.\n\nAguarde até faltarem 3 dias para o início dos jogos!`,
    });
    return;
  }

  const now = dayjs();
  let message = `⚽ *RODADA ${round} - BRASILEIRÃO 2026*\n\n`;

  // Agrupa por data (servidor já está em America/Sao_Paulo)
  const byDate = new Map<string, typeof filteredMatches>();
  for (const match of filteredMatches) {
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
      const matchStarted = dayjs(match.matchDate).isBefore(now);

      // Formata número com emojis individuais para cada dígito
      const numberEmojis = matchNumber
        .toString()
        .split("")
        .map((d) => `${d}️⃣`)
        .join("");

      const warningText = matchStarted ? " ⚠️ _Jogo iniciado_" : "";
      message += `${numberEmojis} ${match.homeTeam} x ${match.awayTeam} (${time})${warningText}\n`;
      matchNumber++;
    }
    message += "\n";
  }

  message += `---\n`;
  message += `📝 *Como palpitar:*\n`;
  message += `Envie todos os palpites de uma vez só!`;

  // Envia primeira mensagem com as informações completas
  await sock.sendMessage(chatId, { text: message });

  // Monta segunda mensagem apenas com os jogos para copiar (apenas jogos não iniciados)
  let copyMessage = ``;
  for (const [, dateMatches] of byDate) {
    for (const match of dateMatches) {
      const matchStarted = dayjs(match.matchDate).isBefore(now);
      if (!matchStarted) {
        copyMessage += `${match.homeTeam} x ${match.awayTeam}\n`;
      }
    }
  }

  if (copyMessage.length > 0) {
    copyMessage += `\n💡 _Copie, altere os placares e envie!_`;
    // Envia segunda mensagem com lista para copiar
    await sock.sendMessage(chatId, { text: copyMessage });
  }
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
    id: string;
    name: string;
    points: number;
    bets: number;
    exactScores: number;
    correctWinners: number;
  }

  const playerStats = new Map<string, PlayerRoundStats>();

  for (const match of matches) {
    for (const bet of match.bets) {
      const existing = playerStats.get(bet.playerId) || {
        id: bet.player.id,
        name: bet.player.name,
        points: 0,
        bets: 0,
        exactScores: 0,
        correctWinners: 0,
      };

      existing.bets++;
      if (bet.points !== null) {
        existing.points += bet.points;
        if (bet.points === 2) existing.exactScores++;
        if (bet.points === 1) existing.correctWinners++;
      }

      playerStats.set(bet.playerId, existing);
    }
  }

  const ranking = Array.from(playerStats.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return b.correctWinners - a.correctWinners;
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

  // Mostra resultados se houver jogos finalizados
  if (finishedMatches.length > 0) {
    message += `*Resultados:*\n`;
    for (const match of finishedMatches) {
      message += `✅ ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}\n`;
    }
    message += `\n`;
  }

  message += `*Classificação:*\n`;
  const medals = ["🥇", "🥈", "🥉"];
  for (let index = 0; index < ranking.length; index++) {
    const player = ranking[index];
    const medal = medals[index] || `${index + 1}.`;
    const displayName = await getPlayerDisplayName(player.id, player.name);
    message += `${medal} ${displayName}: ${player.points} pts (${player.exactScores} exatos, ${player.correctWinners} acertos)\n`;
  }

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Envia mensagem de resultados de uma rodada com formato melhorado
 * @param chatId - ID do chat para enviar a mensagem
 * @param roundNumber - Número da rodada (opcional, se não informado usa a atual)
 */
async function sendResultsMessage(chatId: string, roundNumber?: number) {
  if (!sock) return;

  let targetRound: number | null = roundNumber ?? null;

  // Se rodada não foi especificada, busca a rodada mais recente com jogos finalizados
  if (!targetRound) {
    targetRound = await getLatestFinishedRound();

    if (!targetRound) {
      await sock.sendMessage(chatId, {
        text: "📭 Ainda não há resultados lançados ou jogos finalizados.",
      });
      return;
    }
  }

  // Busca todos os jogos da rodada
  const matches = await prisma.match.findMany({
    where: { round: targetRound },
    include: {
      bets: {
        include: { player: true },
      },
    },
    orderBy: { matchDate: "asc" },
  });

  if (matches.length === 0) {
    await sock.sendMessage(chatId, {
      text: `📭 Rodada ${targetRound} não encontrada.`,
    });
    return;
  }

  const finishedMatches = matches.filter((m) => m.status === "FINISHED");

  // Se não há jogos finalizados
  if (finishedMatches.length === 0) {
    let message = `⚽ *RODADA ${targetRound} - RESULTADOS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📭 Ainda não há resultados lançados ou jogos finalizados nesta rodada.\n\n`;
    message += `💬 *Comandos:*\n`;
    message += `• !ranking - Ranking geral\n`;
    message += `• !ranking ${targetRound} - Ranking da rodada ${targetRound}`;

    await sock.sendMessage(chatId, { text: message });
    return;
  }

  // Monta mensagem com os resultados
  let message = `⚽ *RODADA ${targetRound} - RESULTADOS*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📊 ${finishedMatches.length}/${matches.length} jogos finalizados\n\n`;

  // Mostra resultados dos jogos finalizados com quem acertou
  for (const match of finishedMatches) {
    message += `✅ ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam} (FINALIZADO)\n\n`;

    // Separa quem cravou, acertou o vencedor e errou
    const exactScorePlayers: string[] = [];
    const correctWinnerPlayers: string[] = [];
    const missedPlayers: string[] = [];

    for (const bet of match.bets) {
      const displayName = await getPlayerDisplayName(
        bet.player.id,
        bet.player.name,
      );

      if (bet.points === 2) {
        exactScorePlayers.push(displayName);
      } else if (bet.points === 1) {
        correctWinnerPlayers.push(displayName);
      } else {
        missedPlayers.push(displayName);
      }
    }

    message += `🎯 Cravaram (2pts):\n`;
    if (exactScorePlayers.length > 0) {
      message += `${exactScorePlayers.join(", ")}\n`;
    } else {
      message += `[ninguém]\n`;
    }

    message += `\n⚡ Acertaram resultado (1pt):\n`;
    if (correctWinnerPlayers.length > 0) {
      message += `${correctWinnerPlayers.join(", ")}\n`;
    } else {
      message += `[ninguém]\n`;
    }

    message += `\n❌ Erraram:\n`;
    if (missedPlayers.length > 0) {
      message += `${missedPlayers.join(", ")}\n`;
    } else {
      message += `[ninguém]\n`;
    }

    // Adiciona separador entre jogos
    message += `\n─────────────────────────────\n\n`;
  }

  // Mostra quantos jogos restam
  const scheduledMatches = matches.filter((m) => m.status === "SCHEDULED");
  if (scheduledMatches.length > 0) {
    message += `📌 Ainda restam ${scheduledMatches.length} jogos nesta rodada\n\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💬 *Comandos:*\n`;
  message += `• !ranking - Ranking geral\n`;
  message += `• !ranking ${targetRound} - Ranking da rodada ${targetRound}`;

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Busca a última rodada que existe no banco e tem jogos finalizados
 * Prioriza a rodada mais alta, mesmo que não esteja 100% finalizada
 */
async function getLatestFinishedRound(): Promise<number | null> {
  // Busca todas as rodadas distintas, ordenadas descrescente
  const allRounds = await prisma.match.groupBy({
    by: ["round"],
    orderBy: { round: "desc" },
  });

  for (const roundData of allRounds) {
    // Para cada rodada (da mais alta para a mais baixa)
    const round = roundData.round;

    // Verifica se tem pelo menos 1 jogo finalizado nesta rodada
    const hasFinished = await prisma.match.findFirst({
      where: {
        round: round,
        status: "FINISHED",
      },
    });

    if (hasFinished) {
      // Retorna a primeira rodada (mais alta) que tem jogos FINISHED
      return round;
    }
  }

  // Nenhuma rodada tem jogos finalizados
  return null;
}

/**
 * Envia status da rodada atual com pontuação parcial
 */
async function sendCurrentRoundStatus(chatId: string, roundNumber?: number) {
  // Usa a nova função de resultados com formato melhorado
  await sendResultsMessage(chatId, roundNumber);
}

/**
 * Envia ranking parcial para o grupo (chamado pelo painel admin)
 */
export async function sendPartialRankingNotification(round: number) {
  if (!sock || !BOLAO_GROUP_ID) {
    console.log("⚠️  WhatsApp não conectado ou grupo não configurado");
    return;
  }

  await sendCurrentRoundStatus(BOLAO_GROUP_ID, round);
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
  for (const p of pendingPlayers) {
    const displayName = await getPlayerDisplayName(p.id, p.name);
    message += `• ${displayName}\n`;
  }
  message += `\n📝 Enviem seus palpites, galera!`;

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Envia todos os palpites da rodada (incluindo jogos finalizados)
 * @param roundNumber - Número da rodada (opcional, se não informado usa a atual)
 */
async function sendAllBets(chatId: string, roundNumber?: number) {
  if (!sock) return;

  let targetRound = roundNumber;

  // Se rodada não foi especificada, busca a rodada atual
  if (!targetRound) {
    const today = dayjs().startOf("day").toDate();
    const recentMatch = await prisma.match.findFirst({
      where: {
        OR: [
          { matchDate: { gte: today } },
          {
            status: "FINISHED",
            matchDate: { gte: dayjs().subtract(2, "day").toDate() },
          },
        ],
      },
      orderBy: { matchDate: "asc" },
      select: { round: true },
    });

    if (!recentMatch) {
      await sock.sendMessage(chatId, {
        text: "📭 Não há jogos da rodada no momento.",
      });
      return;
    }
    targetRound = recentMatch.round;
  }

  // Busca TODOS os jogos da rodada (incluindo finalizados)
  const matches = await prisma.match.findMany({
    where: {
      round: targetRound,
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

  let message = `📋 *PALPITES DA RODADA ${targetRound}*\n\n`;

  for (const match of matches) {
    // Indica se jogo já terminou
    const statusIcon = match.status === "FINISHED" ? "✅" : "⚽";
    const resultText =
      match.status === "FINISHED" && match.homeScore !== null
        ? ` (${match.homeScore}x${match.awayScore})`
        : "";

    message += `${statusIcon} *${match.homeTeam} x ${match.awayTeam}*${resultText}\n`;

    if (match.bets.length === 0) {
      message += `  _Nenhum palpite_\n`;
    } else {
      for (const bet of match.bets) {
        const displayName = await getPlayerDisplayName(
          bet.player.id,
          bet.player.name,
        );
        const pointsText = bet.points !== null ? ` → ${bet.points}pts` : "";
        message += `  • ${displayName}: ${bet.homeScoreGuess}x${bet.awayScoreGuess}${pointsText}\n`;
      }
    }
    message += "\n";
  }

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Retorna lista de jogadores que ainda não palpitaram nos jogos informados
 */
async function getPendingPlayers(
  matches: any[],
): Promise<Array<{ id: string; name: string; phone: string }>> {
  if (!sock || !BOLAO_GROUP_ID) return [];

  try {
    // Busca todos os jogadores cadastrados
    const allPlayers = await prisma.player.findMany();

    // IDs dos jogadores que já palpitaram
    const playerIdsWhoBet = new Set(
      matches.flatMap((m) => m.bets.map((b: any) => b.playerId)),
    );

    // Jogadores que ainda não palpitaram
    const pendingPlayers = allPlayers
      .filter((p) => !playerIdsWhoBet.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, phone: p.phone }));

    return pendingPlayers;
  } catch (error) {
    console.error("❌ Erro ao buscar jogadores pendentes:", error);
    return [];
  }
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

  const displayName = await getPlayerDisplayName(player.id, player.name);
  let message = `📝 *Seus últimos palpites, ${displayName}:*\n\n`;

  for (const bet of player.bets) {
    const pointsStr = bet.points !== null ? ` → ${bet.points}pts` : "";
    message += `• ${bet.match.homeTeam} ${bet.homeScoreGuess}x${bet.awayScoreGuess} ${bet.match.awayTeam}${pointsStr}\n`;
  }

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Envia informações completas sobre o bot e regras do bolão
 */
async function sendBotInfo(chatId: string) {
  if (!sock) return;

  const message =
    `🤖 *CHUTAÍ - BOT DO BOLÃO BRASILEIRÃO 2026*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📋 *REGRAS DO BOLÃO*\n\n` +
    `✅ *Pontuação:*\n` +
    `• Placar EXATO: *2 pontos*\n` +
    `• Vencedor/Empate CERTO: *1 ponto*\n` +
    `• Placar ERRADO: *0 pontos*\n\n` +
    `🚫 *ATENÇÃO - Palpites IMUTÁVEIS:*\n` +
    `• Uma vez enviado, o palpite *NÃO PODE* ser alterado\n` +
    `• Confira bem antes de enviar!\n` +
    `• Tentativas de enviar novamente serão rejeitadas\n\n` +
    `⏰ *Prazo para Palpitar:*\n` +
    `• Palpites só valem se enviados *ANTES* do jogo começar\n` +
    `• Após o início, o jogo não aceita mais palpites\n\n` +
    `👥 *Palpitar por Outra Pessoa:*\n` +
    `• Digite o NOME na primeira linha, depois os palpites\n` +
    `• SEMPRE use o MESMO nome para a mesma pessoa\n` +
    `• Maiúsculas/minúsculas são ignoradas (NEI = Nei = nei)\n` +
    `• Mas "NEI" ≠ "CLAUDINEI" (são jogadores diferentes!)\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📝 *FORMATOS ACEITOS PARA PALPITES*\n\n` +
    `Escolha um dos formatos abaixo. Todos funcionam!\n\n` +
    `1️⃣ *FORMATO COM NÚMERO*\n` +
    `1) 2x1\n` +
    `2) 0x0\n` +
    `3) 1x1\n\n` +
    `2️⃣ *FORMATO "TIME X TIME PLACAR" (Recomendado)*\n` +
    `Mais seguro e sem confusão!\n\n` +
    `Útil se você copia a lista de jogos!\n\n` +
    `Vitória x Flamengo 1x3\n` +
    `Chapecoense x Coritiba 1x2\n` +
    `Mirassol x Cruzeiro 1x3\n\n` +
    `3️⃣ *FORMATO "TIME PLACAR TIME"*\n` +
    `Tradicional e simples!\n\n` +
    `Flamengo 2x1 Vasco\n` +
    `Vasco 2x0 Juventude\n` +
    `Inter 1x1 Bahia\n\n` +
    `4️⃣ *FORMATO APENAS PLACARES*\n` +
    `Mais rápido, mas precisa enviar a quantidade exata de jogos!\n\n` +
    `0 x 1\n` +
    `2 x 1\n` +
    `0 x 1\n` +
    `2 x 0\n` +
    `2 x 1\n\n` +
    `💡 *Dica:* Se for mais fácil, você pode misturar os formatos!\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🤖 *FUNCIONAMENTO DO BOT*\n\n` +
    `📍 *Notificações Automáticas:*\n` +
    `• 06h - Bom dia com jogos da rodada\n` +
    `• 11h30/14h/17h/20h - Lembretes periódicos\n` +
    `• 1h antes - Última chamada!\n\n` +
    `📝 *Cadastro e Atualização:*\n` +
    `• Jogos e resultados cadastrados manualmente\n` +
    `• pelo administrador via painel de controle\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⚙️ *COMANDOS DISPONÍVEIS*\n\n` +
    `Use *!ajuda* para ver lista completa de comandos\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎯 *BOA SORTE E BONS PALPITES!* ⚽`;

  await sock.sendMessage(chatId, { text: message });
}

/**
 * Envia a lista de comandos
 */
async function sendHelp(chatId: string) {
  if (!sock) return;

  const message =
    `🤖 *COMANDOS DO CHUTAÍ*\n\n` +
    `*📋 Palpites e Jogos:*\n` +
    `*!jogos* - Ver jogos da rodada\n` +
    `*!palpites* - Ver todos os palpites da rodada atual\n` +
    `*!palpites X* - Ver palpites da rodada X\n` +
    `*!meus* - Ver seus palpites\n` +
    `*!faltam* - Ver quem falta palpitar\n\n` +
    `*📊 Resultados:*\n` +
    `*!resultados* - Ver resultados da rodada atual\n` +
    `*!resultados X* - Ver resultados da rodada X\n\n` +
    `*🏆 Rankings:*\n` +
    `*!ranking* - Ranking geral do bolão\n` +
    `*!ranking X* - Ranking da rodada X\n` +
    `*!rodada* - Status e parcial da rodada atual\n\n` +
    `*📝 Para palpitar:*\n` +
    `Envie todos os palpites de uma vez!\n` +
    `Ex: \`Flamengo 2x1 Vasco\`\n\n` +
    `*👥 Palpitar em nome de outra pessoa:*\n` +
    `NOME DA PESSOA\n` +
    `Flamengo 2x1 Vasco\n\n` +
    `*ℹ️ Cadastro de Jogos:*\n` +
    `Os jogos são cadastrados manualmente\n` +
    `pelo administrador via painel de controle.`;

  await sock.sendMessage(chatId, { text: message });
}

// ========================================
// NOTIFICAÇÕES AUTOMÁTICAS
// ========================================

let morningSchedulerRunning = false;
let reminderSchedulerRunning = false;

/**
 * Inicia o scheduler de notificações matinais
 * Envia os jogos do dia automaticamente às 6h da manhã
 */
function startMorningNotificationScheduler() {
  if (morningSchedulerRunning) return;
  morningSchedulerRunning = true;

  console.log("⏰ Scheduler de notificações matinais ativado (6h)");
  console.log(
    "⏰ Scheduler de lembretes: 11h30, 14h, 17h, 20h + 1h antes do jogo",
  );

  // Verifica a cada minuto se é hora de enviar
  setInterval(async () => {
    const now = dayjs();
    const hour = now.hour();
    const minute = now.minute();

    // Envia às 6:00 da manhã
    if (hour === 6 && minute === 0) {
      await sendMorningNotification();
    }

    // Lembretes periódicos: 11h30, 14h, 17h, 20h
    if (hour === 11 && minute === 30) {
      console.log("🔔 Horário 11h30 - verificando lembrete...");
      await sendReminderIfNeeded();
    }
    if (minute === 0 && [14, 17, 20].includes(hour)) {
      console.log(`🔔 Horário ${hour}h - verificando lembrete...`);
      await sendReminderIfNeeded();
    }
  }, 60000); // Verifica a cada 1 minuto

  // Inicia scheduler especial para lembrete 1h antes do jogo
  startOneHourBeforeReminder();

  // Verifica se perdemos a notificação matinal
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
 * Verifica se falta 1h para o PRIMEIRO jogo DO DIA e envia lembrete final
 * (apenas uma vez por dia, antes do primeiro jogo)
 */
async function checkOneHourBeforeGame() {
  if (!sock || !BOLAO_GROUP_ID) return;

  const now = dayjs();
  const todayStart = now.startOf("day");
  const todayEnd = now.endOf("day");

  // Busca o PRIMEIRO jogo DO DIA (não qualquer próximo jogo)
  const firstGameOfDay = await prisma.match.findFirst({
    where: {
      status: "SCHEDULED",
      matchDate: {
        gte: todayStart.toDate(),
        lte: todayEnd.toDate(),
      },
    },
    orderBy: { matchDate: "asc" },
  });

  if (!firstGameOfDay) return;

  const matchTime = dayjs(firstGameOfDay.matchDate);
  const diffMinutes = matchTime.diff(now, "minute");

  // Se falta entre 55 e 65 minutos para o PRIMEIRO jogo do dia
  if (diffMinutes >= 55 && diffMinutes <= 65) {
    // Verifica se já enviamos esse lembrete HOJE
    const todayKey = now.format("YYYY-MM-DD");
    const reminderKey = `1H_BEFORE_DAY_${todayKey}`;
    const alreadySent = await prisma.notification.findFirst({
      where: {
        type: reminderKey,
      },
    });

    if (!alreadySent) {
      await sendFinalReminder(firstGameOfDay.round);

      // Marca que já enviamos o lembrete de 1h antes HOJE
      await prisma.notification.create({
        data: {
          type: reminderKey,
          sentAt: now.toDate(),
        },
      });

      console.log(
        `✅ Lembrete 1h antes enviado - primeiro jogo do dia: ${matchTime.format("HH:mm")}`,
      );
    }
  }
}

/**
 * Envia lembrete final 1h antes do jogo
 */
async function sendFinalReminder(round: number) {
  if (!sock || !BOLAO_GROUP_ID) return;

  // Busca jogos da rodada
  const allMatches = await prisma.match.findMany({
    where: {
      round,
      status: "SCHEDULED",
    },
    include: {
      bets: { select: { playerId: true } },
    },
    orderBy: { matchDate: "asc" },
  });

  if (allMatches.length === 0) return;

  // Filtra jogos adiados (primeiro jogo + 2 dias), mas SEMPRE inclui jogos de hoje
  const now = dayjs();
  const firstMatchDate = dayjs(allMatches[0].matchDate).startOf("day");
  const maxDate = firstMatchDate.add(2, "day").endOf("day");
  const validMatches = allMatches.filter(
    (match) =>
      dayjs(match.matchDate).isBefore(maxDate) ||
      dayjs(match.matchDate).isSame(maxDate, "day") ||
      dayjs(match.matchDate).isSame(now, "day"), // inclui jogos reagendados para hoje
  );

  // Filtra jogos que ainda NÃO começaram (matchDate > agora)
  const matches = validMatches.filter((match) =>
    dayjs(match.matchDate).isAfter(now),
  );

  if (matches.length === 0) return;

  const firstMatch = matches[0];

  // Busca jogadores que ainda não palpitaram
  const pendingPlayers = await getPendingPlayers(matches);
  const pendingCount = pendingPlayers.length;

  if (pendingCount === 0) return; // Todos já palpitaram

  // Mensagem 1: Última chamada com jogos
  let message = `🚨 *ÚLTIMA CHAMADA!* 🚨\n\n`;
  message += `⏰ Falta *1 HORA* para começar!\n\n`;
  message += `⚽ *JOGOS PENDENTES DA RODADA ${round}:*\n`;
  matches.forEach((match) => {
    const isPostponed =
      match.postponedFrom !== null || dayjs(match.matchDate).isAfter(maxDate);
    const postponedNote = isPostponed
      ? ` _(Jogo adiado da rodada ${match.postponedFrom ? match.postponedFrom.replace("R", "") : String(round)})_`
      : "";
    const dateLabel = dayjs(match.matchDate).format("DD/MM");
    const time = dayjs(match.matchDate).format("HH[h]mm");
    message += `⚽ ${match.homeTeam} x ${match.awayTeam} (${dateLabel} ${time})${postponedNote}\n`;
  });

  message += `\n📋 *Ainda não palpitaram (${pendingCount}):*\n`;

  // Busca metadados do grupo para verificar quem está no grupo
  const groupMetadata = await sock.groupMetadata(BOLAO_GROUP_ID);
  const groupParticipants = groupMetadata.participants.map((p) => p.id);

  // Cria lista de menções (WhatsApp IDs dos jogadores que estão no grupo)
  const mentions: string[] = [];

  // Lista nomes dos jogadores pendentes (máximo 15) com @ para menção
  const namesToShow = pendingPlayers.slice(0, 15);
  for (const player of namesToShow) {
    const displayName = await getPlayerDisplayName(player.id, player.name);
    // Formata o número do telefone para formato do WhatsApp
    const whatsappId = `${player.phone}@s.whatsapp.net`;

    // Verifica se o jogador está no grupo
    if (groupParticipants.includes(whatsappId)) {
      mentions.push(whatsappId);
      message += `• @${displayName}\n`;
    } else {
      // Se não está no grupo, mostra sem @
      message += `• ${displayName}\n`;
    }
  }

  if (pendingPlayers.length > 15) {
    message += `_... e mais ${pendingPlayers.length - 15} pessoa(s)_\n`;
  }

  message += `\n⚠️ _Corram que ainda dá tempo!_\n`;
  message += `⚠️ _Lembre-se: depois de enviado, não é possível alterar!_`;

  await sock.sendMessage(BOLAO_GROUP_ID, { text: message, mentions });

  // Aguarda 1 segundo antes de enviar a segunda mensagem
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mensagem 2: Lista para copiar
  let copyMessage = matches
    .map((match) => `${match.homeTeam} x ${match.awayTeam}`)
    .join("\n");
  copyMessage += `\n\n💡 _Copie, altere os placares e envie aqui!_`;

  await sock.sendMessage(BOLAO_GROUP_ID, { text: copyMessage });

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
 * - Primeiro dia da rodada: mostra TODOS os jogos da rodada
 * - Demais dias: mostra todos os jogos PENDENTES (SCHEDULED) da rodada
 */
async function sendReminderIfNeeded(force = false) {
  console.log("🔍 sendReminderIfNeeded: iniciando verificação...");

  if (!sock) {
    console.log("⚠️ sendReminderIfNeeded: sock não disponível");
    return;
  }

  if (!BOLAO_GROUP_ID) {
    console.log("⚠️ sendReminderIfNeeded: BOLAO_GROUP_ID não configurado");
    return;
  }

  const now = dayjs();
  const todayStart = now.startOf("day").toDate();
  const todayEnd = now.endOf("day").toDate();

  // Busca jogos de hoje para saber se há rodada ativa
  const matchesToday = await prisma.match.findMany({
    where: {
      matchDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    orderBy: { matchDate: "asc" },
  });

  if (matchesToday.length === 0) {
    console.log("⚠️ sendReminderIfNeeded: sem jogos hoje, não envia");
    return;
  }

  const round = matchesToday[0].round;

  // Busca TODOS os jogos SCHEDULED da rodada
  const allRoundMatchesRaw = await prisma.match.findMany({
    where: {
      round: round,
      status: "SCHEDULED",
    },
    include: {
      bets: { select: { playerId: true } },
    },
    orderBy: { matchDate: "asc" },
  });

  if (allRoundMatchesRaw.length === 0) {
    console.log("⚠️ sendReminderIfNeeded: sem jogos pendentes na rodada");
    return;
  }

  // Filtra jogos adiados (mesma lógica da notificação matinal: primeiro jogo + 2 dias)
  const firstMatchOfRound = await prisma.match.findFirst({
    where: { round: round },
    orderBy: { matchDate: "asc" },
  });

  let validMatches = allRoundMatchesRaw;
  if (firstMatchOfRound) {
    const firstMatchDate = dayjs(firstMatchOfRound.matchDate).startOf("day");
    const maxDate = firstMatchDate.add(2, "day").endOf("day");
    validMatches = allRoundMatchesRaw.filter(
      (match) =>
        dayjs(match.matchDate).isBefore(maxDate) ||
        dayjs(match.matchDate).isSame(maxDate, "day"),
    );
  }

  // Filtra jogos que ainda NÃO começaram (futuro)
  const pendingMatches = validMatches.filter((match) =>
    dayjs(match.matchDate).isAfter(now),
  );

  // Busca jogos SCHEDULED de hoje que não estão em pendingMatches
  // (inclui reagendados mesmo sem a flag postponedFrom definida)
  const pendingMatchIds = new Set(pendingMatches.map((m) => m.id));
  const extraMatchesToday = await prisma.match.findMany({
    where: {
      matchDate: {
        gte: todayStart,
        lte: todayEnd,
      },
      status: "SCHEDULED",
      id: { notIn: Array.from(pendingMatchIds) },
    },
    include: {
      bets: { select: { playerId: true } },
    },
    orderBy: { matchDate: "asc" },
  });

  // Combina jogos normais com jogos extras de hoje
  const allRoundMatches = [...pendingMatches];
  if (extraMatchesToday.length > 0) {
    allRoundMatches.push(...extraMatchesToday);
    console.log(
      `📌 Incluindo ${extraMatchesToday.length} jogo(s) extra(s) de hoje no lembrete`,
    );
  }

  if (allRoundMatches.length === 0) {
    console.log("⚠️ sendReminderIfNeeded: sem jogos válidos na rodada");
    return;
  }

  const isFirstDay = firstMatchOfRound
    ? now.isSame(dayjs(firstMatchOfRound.matchDate), "day")
    : false;

  // Busca jogadores que ainda não palpitaram
  const pendingPlayers = await getPendingPlayers(allRoundMatches);
  const pendingCount = pendingPlayers.length;

  console.log(`🔍 sendReminderIfNeeded: ${pendingCount} membros pendentes`);

  if (pendingCount === 0) {
    console.log("✅ sendReminderIfNeeded: todos os membros já palpitaram!");
    return;
  }

  // Verifica se já enviamos lembrete nessa hora (evita duplicidade)
  // Quando chamado manualmente via painel admin (force=true), ignora essa verificação
  if (!force) {
    const alreadySent = await prisma.notification.findFirst({
      where: {
        type: { startsWith: `REMINDER_${now.format("YYYY-MM-DD-HH")}` },
      },
    });

    if (alreadySent) {
      console.log(`⚠️ sendReminderIfNeeded: já enviamos lembrete nessa hora`);
      return;
    }
  }

  // Calcula tempo até o primeiro jogo de HOJE
  const firstMatchToday = matchesToday.find((m) => m.status === "SCHEDULED");
  let timeText = "";
  if (firstMatchToday) {
    const matchTime = dayjs(firstMatchToday.matchDate);
    const diffHours = matchTime.diff(now, "hour");
    const diffMinutes = matchTime.diff(now, "minute") % 60;
    if (diffHours > 0) {
      timeText = `~${diffHours}h${diffMinutes > 0 ? diffMinutes + "min" : ""}`;
    } else if (diffMinutes > 0) {
      timeText = `~${diffMinutes} minutos`;
    } else {
      timeText = "em breve";
    }
  }

  // Monta a mensagem
  let message = `⏰ *LEMBRETE DE PALPITES*\n\n`;
  if (timeText) {
    message += `🏟️ Primeiro jogo em ${timeText}\n\n`;
  }

  if (isFirstDay) {
    // Primeiro dia: mostra TODOS os jogos da rodada
    message += `⚽ *JOGOS DA RODADA ${round}:*\n`;

    // Agrupa por data
    const byDate = new Map<string, typeof allRoundMatches>();
    for (const match of allRoundMatches) {
      const dateKey = dayjs(match.matchDate).format("YYYY-MM-DD");
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, []);
      }
      byDate.get(dateKey)!.push(match);
    }

    for (const [dateKey, dateMatches] of byDate) {
      const dateLabel = dayjs(dateKey).format("DD/MM (dddd)");
      message += `📅 *${dateLabel}*\n`;
      for (const match of dateMatches) {
        const time = dayjs(match.matchDate).format("HH[h]mm");
        message += `⚽ ${match.homeTeam} x ${match.awayTeam} (${time})\n`;
      }
      message += `\n`;
    }
  } else {
    // Demais dias: mostra todos os jogos PENDENTES da rodada
    message += `⚽ *JOGOS PENDENTES DA RODADA ${round}:*\n`;
    for (const match of allRoundMatches) {
      const isPostponed =
        extraMatchesToday.some((p) => p.id === match.id) ||
        match.postponedFrom !== null;
      const postponedNote = isPostponed
        ? ` _(Jogo adiado da rodada ${match.postponedFrom ? match.postponedFrom.replace("R", "") : String(match.round)})_`
        : "";
      const dateLabel = dayjs(match.matchDate).format("DD/MM");
      const time = dayjs(match.matchDate).format("HH[h]mm");
      message += `⚽ ${match.homeTeam} x ${match.awayTeam} (${dateLabel} ${time})${postponedNote}\n`;
    }
    message += `\n`;
  }

  message += `📋 *Ainda não palpitaram (${pendingCount}):*\n`;

  // Busca metadados do grupo para verificar quem está no grupo
  const groupMetadata = await sock.groupMetadata(BOLAO_GROUP_ID);
  const groupParticipants = groupMetadata.participants.map((p) => p.id);

  // Cria lista de menções (WhatsApp IDs dos jogadores que estão no grupo)
  const mentions: string[] = [];

  // Lista nomes dos jogadores pendentes (máximo 15) com @ para menção
  const namesToShow = pendingPlayers.slice(0, 15);
  for (const player of namesToShow) {
    const displayName = await getPlayerDisplayName(player.id, player.name);
    // Formata o número do telefone para formato do WhatsApp
    const whatsappId = `${player.phone}@s.whatsapp.net`;

    // Verifica se o jogador está no grupo
    if (groupParticipants.includes(whatsappId)) {
      mentions.push(whatsappId);
      message += `· @${displayName}\n`;
    } else {
      // Se não está no grupo, mostra sem @
      message += `· ${displayName}\n`;
    }
  }

  if (pendingPlayers.length > 15) {
    message += `_... e mais ${pendingPlayers.length - 15} pessoa(s)_\n`;
  }

  message += `\n📝 _Enviem seus palpites!_\n`;
  message += `⚠️ _Lembre-se: palpites não podem ser alterados depois de enviados._`;

  try {
    await sock.sendMessage(BOLAO_GROUP_ID, { text: message, mentions });

    // Aguarda 1 segundo antes de enviar a segunda mensagem
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mensagem 2: Lista para copiar (todos os jogos pendentes da rodada)
    let copyMessage = allRoundMatches
      .map((match) => `${match.homeTeam} x ${match.awayTeam}`)
      .join("\n");
    copyMessage += `\n\n💡 _Copie, altere os placares e envie aqui!_`;

    await sock.sendMessage(BOLAO_GROUP_ID, { text: copyMessage });

    // Registra que enviamos
    await prisma.notification.create({
      data: {
        type: `REMINDER_${now.format("YYYY-MM-DD-HH")}`,
        sentAt: new Date(),
        groupId: BOLAO_GROUP_ID,
      },
    });

    console.log(`✅ Lembrete enviado! (${pendingPlayers.length} pendentes)`);
  } catch (error) {
    console.error("❌ Erro ao enviar lembrete:", error);
  }
}

/**
 * Verifica se deveria ter enviado hoje (útil se o bot reiniciar após as 6h)
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

  // Se há jogos hoje e já passou das 6h, verifica se já notificamos
  if (matchesToday && now.hour() >= 6) {
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

  // Busca TODOS os jogos de hoje (independente da rodada)
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

  // Agrupa jogos por rodada para envio organizado
  const matchesByRound = new Map<number, typeof matchesToday>();
  for (const match of matchesToday) {
    if (!matchesByRound.has(match.round)) {
      matchesByRound.set(match.round, []);
    }
    matchesByRound.get(match.round)!.push(match);
  }

  const roundNumbers = Array.from(matchesByRound.keys()).sort((a, b) => a - b);
  const mainRound = roundNumbers[roundNumbers.length - 1]; // Última rodada (mais atual)

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

  // Se há jogos de múltiplas rodadas hoje, envia TODOS os jogos
  if (roundNumbers.length > 1) {
    console.log(
      `📅 Jogos de ${roundNumbers.length} rodadas hoje: ${roundNumbers.join(", ")}`,
    );
    await sendMultiRoundMorningNotification(
      today,
      roundNumbers,
      matchesByRound,
    );
    return;
  }

  // Se só há uma rodada, usa a lógica original
  const round = matchesToday[0].round;

  // Busca jogos adiados que estão agendados para HOJE (têm a flag postponedFrom)
  const postponedToday = await prisma.match.findMany({
    where: {
      matchDate: {
        gte: todayStart,
        lte: todayEnd,
      },
      postponedFrom: {
        not: null,
      },
    },
    orderBy: { matchDate: "asc" },
  });

  // Busca o PRIMEIRO jogo da rodada (qualquer status, para calcular datas)
  const firstMatchOfRound = await prisma.match.findFirst({
    where: {
      round: round,
    },
    orderBy: { matchDate: "asc" },
  });

  if (!firstMatchOfRound) {
    console.log("📭 Erro ao buscar primeiro jogo da rodada");
    return;
  }

  const firstMatchDate = dayjs(firstMatchOfRound.matchDate).startOf("day");
  const isFirstDayOfRound = today.isSame(firstMatchDate, "day");

  // Se for o PRIMEIRO DIA da rodada, envia lista completa
  if (isFirstDayOfRound) {
    console.log("📅 Primeiro dia da rodada - enviando lista completa");

    // Busca TODOS os jogos da rodada
    const allRoundMatches = await prisma.match.findMany({
      where: {
        round: round,
        status: "SCHEDULED",
      },
      orderBy: { matchDate: "asc" },
    });

    // Filtra jogos: apenas até 3 dias após o primeiro jogo (exclui adiados)
    const maxDate = firstMatchDate.add(2, "day").endOf("day"); // +2 dias = 3 dias no total
    const validMatches = allRoundMatches.filter(
      (match) =>
        dayjs(match.matchDate).isBefore(maxDate) ||
        dayjs(match.matchDate).isSame(maxDate, "day"),
    );

    // Identifica jogos adiados (para notificar posteriormente)
    const postponedMatches = allRoundMatches.filter((match) =>
      dayjs(match.matchDate).isAfter(maxDate),
    );

    if (postponedMatches.length > 0) {
      console.log(
        `📌 ${postponedMatches.length} jogo(s) adiado(s) detectado(s) na rodada ${round}`,
      );
      // Marca jogos como adiados no banco para referência futura
      for (const postponed of postponedMatches) {
        await prisma.match.update({
          where: { id: postponed.id },
          data: {
            // Adiciona flag para identificar jogo adiado posteriormente
            postponedFrom: `R${round}`,
          },
        });
      }
    }

    // Filtra jogos que ainda NÃO começaram (evita problemas se bot reiniciar após jogo começar)
    const futureMatches = validMatches.filter((match) =>
      dayjs(match.matchDate).isAfter(today),
    );

    if (futureMatches.length === 0) {
      console.log("📭 Sem jogos futuros na rodada");
      return;
    }

    // Monta a mensagem com TODOS os jogos válidos da rodada
    let message = `☀️ *BOM DIA, BOLEIROS!*\n\n`;
    message += `⚽ *JOGOS DA RODADA ${round}*\n\n`;

    // Agrupa por data
    const byDate = new Map<string, typeof futureMatches>();
    for (const match of futureMatches) {
      const dateKey = dayjs(match.matchDate).format("YYYY-MM-DD");
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, []);
      }
      byDate.get(dateKey)!.push(match);
    }

    // Monta mensagem agrupada por data
    for (const [dateKey, dateMatches] of byDate) {
      const dateLabel = dayjs(dateKey).format("DD/MM (dddd)");
      message += `📅 *${dateLabel}*\n`;

      for (const match of dateMatches) {
        const time = dayjs(match.matchDate).format("HH[h]mm");
        message += `🏟️ ${match.homeTeam} x ${match.awayTeam} (${time})\n`;
      }
      message += `\n`;
    }

    message += `📝 *Enviem seus palpites!*\n`;
    message += `_Lembrando: palpite só vale se enviado ANTES do jogo começar!_\n\n`;
    message += `⚠️ *ATENÇÃO: Uma vez enviado, o palpite NÃO PODE ser alterado!*\n`;
    message += `_Confira bem antes de enviar._`;

    // Envia primeira mensagem com as informações completas
    await sock.sendMessage(BOLAO_GROUP_ID, { text: message });

    // Monta segunda mensagem apenas com os jogos para copiar
    let copyMessage = ``;
    for (const match of futureMatches) {
      copyMessage += `${match.homeTeam} x ${match.awayTeam}\n`;
    }
    copyMessage += `\n💡 _Copie, altere os placares e envie aqui!_`;

    // Envia segunda mensagem com lista para copiar
    await sock.sendMessage(BOLAO_GROUP_ID, { text: copyMessage });
  } else {
    // Se NÃO for o primeiro dia, envia jogos PENDENTES da rodada
    console.log("📅 Não é o primeiro dia - enviando jogos pendentes da rodada");

    // Busca TODOS os jogos SCHEDULED da rodada
    const allRoundMatches = await prisma.match.findMany({
      where: {
        round: round,
        status: "SCHEDULED",
      },
      orderBy: { matchDate: "asc" },
    });

    // Filtra adiados (primeiro jogo + 2 dias)
    const maxDate = firstMatchDate.add(2, "day").endOf("day");
    const validMatches = allRoundMatches.filter(
      (match) =>
        dayjs(match.matchDate).isBefore(maxDate) ||
        dayjs(match.matchDate).isSame(maxDate, "day"),
    );

    // Filtra jogos que ainda NÃO começaram (futuro)
    const now = dayjs();
    const pendingMatches = validMatches.filter((match) =>
      dayjs(match.matchDate).isAfter(now),
    );

    // Busca jogos SCHEDULED de hoje não incluídos em pendingMatches
    // (inclui reagendados mesmo sem a flag postponedFrom definida)
    const pendingMatchIds = new Set(pendingMatches.map((m) => m.id));
    const extraMatchesToday = await prisma.match.findMany({
      where: {
        matchDate: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: "SCHEDULED",
        id: { notIn: Array.from(pendingMatchIds) },
      },
      orderBy: { matchDate: "asc" },
    });

    // Combina jogos normais com jogos extras de hoje
    const allMatchesToNotify = [...pendingMatches];
    if (extraMatchesToday.length > 0) {
      allMatchesToNotify.push(...extraMatchesToday);
      console.log(
        `📌 Incluindo ${extraMatchesToday.length} jogo(s) extra(s) de hoje na notificação`,
      );
    }

    if (allMatchesToNotify.length === 0) {
      console.log("📭 Sem jogos pendentes na rodada");
      return;
    }

    let message = `☀️ *BOM DIA, BOLEIROS!*\n\n`;
    message += `⚽ *JOGOS DA RODADA ${round}*\n\n`;

    // Agrupa por data
    const byDateNotify = new Map<string, typeof allMatchesToNotify>();
    for (const match of allMatchesToNotify) {
      const dateKey = dayjs(match.matchDate).format("YYYY-MM-DD");
      if (!byDateNotify.has(dateKey)) byDateNotify.set(dateKey, []);
      byDateNotify.get(dateKey)!.push(match);
    }

    for (const [dateKey, dateMatches] of byDateNotify) {
      const dateLabel = dayjs(dateKey).format("DD/MM (dddd)");
      message += `📅 *${dateLabel}*\n`;
      for (const match of dateMatches) {
        const isPostponed =
          extraMatchesToday.some((p) => p.id === match.id) ||
          match.postponedFrom !== null;
        const postponedNote = isPostponed
          ? ` _(Jogo adiado da rodada ${match.postponedFrom ? match.postponedFrom.replace("R", "") : String(match.round)})_`
          : "";
        const time = dayjs(match.matchDate).format("HH[h]mm");
        message += `🏟️ ${match.homeTeam} x ${match.awayTeam} (${time})${postponedNote}\n`;
      }
      message += `\n`;
    }

    message += `\n📝 *Quem ainda não palpitou, corre que dá tempo!*\n`;
    message += `_Lembrando: palpite só vale se enviado ANTES do jogo começar!_\n\n`;
    message += `⚠️ *ATENÇÃO: Uma vez enviado, o palpite NÃO PODE ser alterado!*\n`;
    message += `_Confira bem antes de enviar._`;

    // Envia primeira mensagem
    await sock.sendMessage(BOLAO_GROUP_ID, { text: message });

    // Monta e envia segunda mensagem com lista para copiar (inclui jogos adiados)
    let copyMessage = ``;
    for (const match of allMatchesToNotify) {
      copyMessage += `${match.homeTeam} x ${match.awayTeam}\n`;
    }
    copyMessage += `\n💡 _Copie, altere os placares e envie aqui!_`;

    await sock.sendMessage(BOLAO_GROUP_ID, { text: copyMessage });
  }

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

/**
 * Envia notificação matinal com jogos de múltiplas rodadas
 */
async function sendMultiRoundMorningNotification(
  today: dayjs.Dayjs,
  roundNumbers: number[],
  matchesByRound: Map<number, any[]>,
) {
  let message = `☀️ *BOM DIA, BOLEIROS!*\n\n`;
  message += `⚽ *JOGOS DE HOJE* (${today.format("DD/MM")}):\n\n`;

  // Agrupa TODOS os jogos de todas as rodadas por data
  const allMatches = Array.from(matchesByRound.values()).flat();
  const byDate = new Map<string, typeof allMatches>();

  for (const match of allMatches) {
    const dateKey = dayjs(match.matchDate).format("YYYY-MM-DD");
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey)!.push(match);
  }

  // Monta mensagem organizada por data e rodada
  for (const [dateKey, dateMatches] of byDate) {
    const dateLabel = dayjs(dateKey).format("DD/MM (dddd)");
    message += `📅 *${dateLabel}*\n`;

    // Agrupa por rodada dentro da mesma data
    const byRound = new Map<number, typeof dateMatches>();
    for (const match of dateMatches) {
      if (!byRound.has(match.round)) {
        byRound.set(match.round, []);
      }
      byRound.get(match.round)!.push(match);
    }

    for (const [round, roundMatches] of byRound) {
      const isPostponedRound = roundMatches[0].postponedFrom !== null;
      const roundLabel = isPostponedRound
        ? `Rodada ${round} (adiada)`
        : `Rodada ${round}`;
      message += `📌 *${roundLabel}*\n`;

      for (const match of roundMatches) {
        const time = dayjs(match.matchDate).format("HH[h]mm");
        message += `🏟️ ${match.homeTeam} x ${match.awayTeam} (${time})\n`;
      }
    }
    message += `\n`;
  }

  message += `📝 *Enviem seus palpites!*\n`;
  message += `_Lembrando: palpite só vale se enviado ANTES do jogo começar!_\n\n`;
  message += `⚠️ *ATENÇÃO: Uma vez enviado, o palpite NÃO PODE ser alterado!*\n`;
  message += `_Confira bem antes de enviar._`;

  // Envia primeira mensagem com as informações completas
  await sock.sendMessage(BOLAO_GROUP_ID, { text: message });

  // Monta segunda mensagem apenas com os jogos para copiar
  let copyMessage = ``;
  for (const [, dateMatches] of byDate) {
    for (const match of dateMatches) {
      copyMessage += `${match.homeTeam} x ${match.awayTeam}\n`;
    }
  }
  copyMessage += `\n💡 _Copie, altere os placares e envie aqui!_`;

  // Envia segunda mensagem com lista para copiar
  await sock.sendMessage(BOLAO_GROUP_ID, { text: copyMessage });

  // Registra que enviamos a notificação
  await prisma.notification.create({
    data: {
      type: "MORNING_GAMES",
      sentAt: new Date(),
      groupId: BOLAO_GROUP_ID,
    },
  });

  console.log(
    `✅ Notificação matinal multi-rodada enviada: ${roundNumbers.join(", ")}`,
  );
}

/**
 * Servidor HTTP interno para receber comandos do painel admin
 */
function startInternalHttpServer() {
  const BOT_API_PORT = process.env.BOT_API_PORT || 3335;

  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    // Rota para enviar ranking parcial
    if (req.method === "POST" && req.url?.startsWith("/send-partial-ranking")) {
      try {
        const urlParams = new URL(req.url, `http://localhost:${BOT_API_PORT}`);
        const round = parseInt(urlParams.searchParams.get("round") || "0");

        if (!sock || !BOLAO_GROUP_ID) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: "WhatsApp não conectado" }));
          return;
        }

        await sendCurrentRoundStatus(BOLAO_GROUP_ID);
        console.log(`📊 Ranking parcial da rodada ${round} enviado via API`);
        res.end(JSON.stringify({ success: true, round }));
      } catch (error) {
        console.error("Erro ao enviar ranking:", error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Erro interno" }));
      }
      return;
    }

    // Rota para enviar lembrete manual
    if (req.method === "POST" && req.url === "/send-reminder") {
      try {
        if (!sock || !BOLAO_GROUP_ID) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: "WhatsApp não conectado" }));
          return;
        }

        await sendReminderIfNeeded(true); // force=true: ignora verificação de duplicidade por hora
        console.log(`🔔 Lembrete manual enviado via API`);
        res.end(JSON.stringify({ success: true, message: "Lembrete enviado" }));
      } catch (error) {
        console.error("Erro ao enviar lembrete:", error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Erro interno" }));
      }
      return;
    }

    // Rota de health check
    if (req.method === "GET" && req.url === "/health") {
      res.end(
        JSON.stringify({
          status: "ok",
          whatsapp: !!sock,
          group: !!BOLAO_GROUP_ID,
        }),
      );
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(BOT_API_PORT, () => {
    console.log(`🔌 API interna do bot rodando na porta ${BOT_API_PORT}`);
  });
}
