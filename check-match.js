const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const match = await prisma.match.findFirst({
    where: {
      homeTeam: { contains: "Athletico" },
      awayTeam: { contains: "Corinthians" },
    },
  });

  if (match) {
    console.log("Jogo encontrado:");
    console.log("  Home:", match.homeTeam);
    console.log("  Away:", match.awayTeam);
    console.log("  Date:", match.matchDate);
    console.log("  Status:", match.status);
    console.log("  Round:", match.round);
    console.log("  PostponedFrom:", match.postponedFrom);
  } else {
    console.log("Jogo NÃO encontrado");
  }

  await prisma.$disconnect();
})();
