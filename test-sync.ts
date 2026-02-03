import { syncRoundGames, syncNextRound } from "./src/whatsapp/smartBot.js";

console.log("🧪 Testando novas funcionalidades de sincronização\n");

(async () => {
  try {
    // Teste 1: Sincronizar rodada específica (rodada 3)
    console.log("1️⃣ Teste: Sincronizar rodada 3");
    console.log("─".repeat(50));
    const result1 = await syncRoundGames(3);
    console.log(
      `\nResultado: ${result1.added} novos, ${result1.updated} atualizados\n`,
    );

    // Teste 2: Detectar e sincronizar próxima rodada
    console.log("2️⃣ Teste: Detectar próxima rodada");
    console.log("─".repeat(50));
    const result2 = await syncNextRound();
    if (result2.round > 0) {
      console.log(`\nRodada ${result2.round} detectada!`);
      console.log(
        `Resultado: ${result2.added} novos, ${result2.updated} atualizados\n`,
      );
    } else {
      console.log("\nNenhuma rodada nova encontrada\n");
    }

    console.log("✅ Testes concluídos!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro nos testes:", error);
    process.exit(1);
  }
})();
