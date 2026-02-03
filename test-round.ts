import {
  fetchRoundGames,
  closeBrowser,
} from "./src/services/sofascoreScraper.js";

(async () => {
  console.log("\n=> Testando fetchRoundGames(2)...");
  const result = await fetchRoundGames(2);
  console.log("Resultado:", result.length, "jogos\n");

  result.forEach((g, i) => {
    console.log(`${i + 1}. ${g.homeTeam} vs ${g.awayTeam}`);
    console.log(`   MatchDate: ${g.matchDate}`);

    try {
      const date = g.matchDate.toISOString().split("T")[0];
      const time = g.matchDate.toTimeString().split(" ")[0];
      const score = `${g.homeScore ?? "-"} x ${g.awayScore ?? "-"}`;
      console.log(
        `   Data: ${date} ${time} | Status: ${g.status} | Placar: ${score}\n`,
      );
    } catch (e) {
      console.log(`   ERRO ao processar data: ${e}\n`);
    }
  });

  await closeBrowser();
})();
