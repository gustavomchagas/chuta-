const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const matches = await prisma.match.findMany({
    where: {
      matchDate: {
        gte: today,
        lte: todayEnd,
      },
    },
    orderBy: { matchDate: "asc" },
  });

  console.log("Jogos de hoje (", today.toISOString(), "):");
  console.log("Total:", matches.length);

  for (const m of matches) {
    console.log("\n" + "=".repeat(60));
    console.log("Home:", m.homeTeam);
    console.log("Away:", m.awayTeam);
    console.log("Date:", m.matchDate);
    console.log("Status:", m.status);
    console.log("Round:", m.round);
    console.log("PostponedFrom:", m.postponedFrom);
  }

  await prisma.$disconnect();
})();
