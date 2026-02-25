import { prisma } from "./src/lib/prisma";
import dayjs from "dayjs";

(async () => {
  const today = dayjs().startOf("day").toDate();
  const todayEnd = dayjs().endOf("day").toDate();

  const matches = await prisma.match.findMany({
    where: {
      matchDate: {
        gte: today,
        lte: todayEnd,
      },
    },
    orderBy: { matchDate: "asc" },
  });

  console.log("Jogos de hoje (19/02):");
  console.log("=".repeat(80));

  for (const m of matches) {
    const time = dayjs(m.matchDate).format("DD/MM HH:mm");
    console.log(`${m.homeTeam} x ${m.awayTeam}`);
    console.log(`  Data/Hora: ${time}`);
    console.log(`  Status: ${m.status}`);
    console.log(`  Round: ${m.round}`);
    console.log(`  PostponedFrom: ${m.postponedFrom || "N/A"}`);
    console.log("");
  }
})();
