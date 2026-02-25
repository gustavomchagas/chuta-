import { PrismaClient } from "./node_modules/.prisma/client";

const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const todayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
  );

  const matches = await prisma.match.findMany({
    where: {
      matchDate: { gte: todayStart, lte: todayEnd },
    },
    orderBy: { matchDate: "asc" },
  });

  console.log("Jogos de hoje:");
  matches.forEach((m) => {
    console.log(
      `ID: ${m.id}, Round: ${m.round}, ${m.homeTeam} x ${m.awayTeam}, Status: ${m.status}, Date: ${m.matchDate.toISOString()}, Postponed: ${m.postponedFrom}`,
    );
  });

  await prisma.$disconnect();
}

main();
