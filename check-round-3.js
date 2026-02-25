const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const matches = await prisma.match.findMany({
    where: {
      round: 3,
    },
    orderBy: { matchDate: "asc" },
  });

  console.log("Jogos da rodada 3:");
  console.log("Total:", matches.length);

  for (const m of matches) {
    console.log("\n" + "-".repeat(60));
    console.log("Home:", m.homeTeam);
    console.log("Away:", m.awayTeam);
    console.log("Date:", m.matchDate);
    console.log("Status:", m.status);
    console.log("PostponedFrom:", m.postponedFrom);
  }

  await prisma.$disconnect();
})();
