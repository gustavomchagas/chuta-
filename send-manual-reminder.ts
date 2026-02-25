import "dotenv/config";
import { prisma } from "./src/lib/prisma";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import makeWASocket, { WASocket } from "@whiskeysockets/baileys";
import { useMultiFileAuthState } from "@whiskeysockets/baileys";
import path from "path";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("pt-br");
dayjs.tz.setDefault("America/Sao_Paulo");

const AUTH_FOLDER = path.join(__dirname, "auth_info_baileys");

async function initBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ["Chutaí Bot", "Safari", "3.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      console.log("✅ Bot conectado!");
      await sendManualReminder(sock);
      await prisma.$disconnect();
      process.exit(0);
    }
    if (connection === "close") {
      console.error("❌ Conexão encerrada:", lastDisconnect?.error?.message);
      await prisma.$disconnect();
      process.exit(1);
    }
  });
}

/**
 * Busca TODOS os jogos de hoje (incluindo jogos adiados de rodadas antigas)
 * Retorna apenas jogos que ainda NÃO começaram
 */
async function getTodayMatches() {
  const now = dayjs();
  const todayStart = now.startOf("day").toDate();
  const todayEnd = now.endOf("day").toDate();

  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      matchDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: {
      bets: { select: { playerId: true } },
    },
    orderBy: { matchDate: "asc" },
  });

  // Filtra apenas jogos que ainda NÃO começaram
  const futureMatches = matches.filter((match) =>
    dayjs(match.matchDate).isAfter(now),
  );

  return futureMatches;
}

/**
 * Envia lembrete manual de jogos de HOJE
 * Inclui jogos de QUALQUER rodada (incluindo adiados de rodadas antigas)
 */
async function sendManualReminder(sock: WASocket) {
  console.log("📢 sendManualReminder: iniciando...");

  // Busca o groupId do banco de dados
  const groupConfig = await prisma.group.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const groupId = groupConfig?.whatsappGroupId;
  if (!groupId) {
    console.error("❌ Nenhum grupo ativo encontrado no banco de dados");
    return;
  }

  console.log(`📍 Enviando para grupo: ${groupId}`);

  const matches = await getTodayMatches();

  if (matches.length === 0) {
    console.log("⚠️ sendManualReminder: sem jogos hoje");
    return;
  }

  console.log(`📢 sendManualReminder: ${matches.length} jogos encontrados`);

  const now = dayjs();
  let message = `⏰ *LEMBRETE DE PALPITES*\n\n`;

  // Calcula tempo até o primeiro jogo
  const firstMatch = matches[0];
  const matchTime = dayjs(firstMatch.matchDate);
  const diffMinutes = matchTime.diff(now, "minute");
  const diffHours = Math.floor(diffMinutes / 60);
  const diffMins = diffMinutes % 60;

  if (diffHours > 0) {
    message += `🏟️ Primeiro jogo em ~${diffHours}h${diffMins > 0 ? diffMins + "min" : ""}\n\n`;
  } else if (diffMinutes > 0) {
    message += `🏟️ Primeiro jogo em ~${diffMinutes} minutos\n\n`;
  }

  message += `⚽ *JOGOS DE HOJE:*\n\n`;
  matches.forEach((match) => {
    const time = dayjs(match.matchDate).format("HH[h]mm");
    const isPostponed = match.postponedFrom !== null;
    const postponedText = isPostponed
      ? ` _(Jogo adiado da rodada ${match.postponedFrom!.replace("R", "")})_`
      : "";
    message += `⚽ ${match.homeTeam} x ${match.awayTeam} (${time})${postponedText}\n`;
  });

  // Busca jogadores que ainda não palpitaram
  const allPlayers = await prisma.player.findMany();
  const playerIdsWhoBet = new Set(
    matches.flatMap((m) => m.bets.map((b: any) => b.playerId)),
  );
  const pendingPlayers = allPlayers.filter(
    (p: any) => !playerIdsWhoBet.has(p.id),
  );
  const pendingCount = pendingPlayers.length;

  if (pendingCount > 0) {
    message += `\n📋 *Ainda não palpitaram (${pendingCount}):*\n`;
    const namesToShow = pendingPlayers.slice(0, 15);
    for (const player of namesToShow) {
      message += `• ${player.name}\n`;
    }
    if (pendingPlayers.length > 15) {
      message += `_... e mais ${pendingPlayers.length - 15} pessoa(s)_\n`;
    }
    message += `\n📝 _Enviem seus palpites!_`;
    message += `\n⚠️ _Lembre-se: palpites não podem ser alterados depois de enviados._`;
  }

  console.log(`📢 Lembrete manual: ${pendingPlayers.length} pendentes`);

  // Envia mensagem principal
  await sock.sendMessage(groupId, { text: message });
  console.log("✅ Mensagem principal enviada!");

  // Aguarda 1 segundo
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Envia segunda mensagem com lista para copiar
  let copyMessage = matches
    .map((m) => `${m.homeTeam} x ${m.awayTeam}`)
    .join("\n");
  copyMessage += `\n\n💡 _Copie, altere os placares e envie aqui!_`;

  await sock.sendMessage(groupId, { text: copyMessage });
  console.log("✅ Mensagem de cópia enviada!");
}

initBot();
