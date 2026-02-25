import "dotenv/config";
import { prisma } from "./src/lib/prisma";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("pt-br");
dayjs.tz.setDefault("America/Sao_Paulo");

async function check() {
  const today = dayjs();
  const todayStart = today.startOf("day").toDate();
  const todayEnd = today.endOf("day").toDate();

  console.log("📅 Data de hoje:", today.format("DD/MM/YYYY"));
  console.log("🔍 Buscando jogos de hoje...\n");

  // Busca todos os jogos de hoje
  const matchesToday = await prisma.match.findMany({
    where: {
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

  console.log(`📊 Total de jogos hoje: ${matchesToday.length}\n`);

  for (const match of matchesToday) {
    console.log("⚽", match.homeTeam, "x", match.awayTeam);
    console.log("   Rodada:", match.round);
    console.log("   Status:", match.status);
    console.log("   Data:", dayjs(match.matchDate).format("DD/MM/YYYY HH:mm"));
    console.log("   PostponedFrom:", match.postponedFrom || "(não definido)");
    console.log("   Palpites:", match.bets.length);
    console.log("");
  }

  // Verifica notificações enviadas hoje
  console.log("📢 Verificando notificações enviadas hoje...\n");
  const notifications = await prisma.notification.findMany({
    where: {
      sentAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    orderBy: { sentAt: "asc" },
  });

  console.log(`📊 Total de notificações hoje: ${notifications.length}\n`);
  for (const notif of notifications) {
    console.log("📬", notif.type);
    console.log(
      "   Enviada em:",
      dayjs(notif.sentAt).format("DD/MM/YYYY HH:mm"),
    );
    console.log("");
  }

  await prisma.$disconnect();
}

check();
