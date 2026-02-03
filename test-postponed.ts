/**
 * Teste do sistema de jogos adiados/cancelados
 */

import { checkPostponedGames } from "./src/whatsapp/smartBot";
import { prisma } from "./src/lib/prisma";

async function testPostponedGames() {
  console.log("🧪 TESTE: Sistema de Jogos Adiados/Cancelados\n");

  try {
    console.log("📊 Jogos atuais no banco de dados:");
    const matches = await prisma.match.findMany({
      where: {
        status: { in: ["SCHEDULED", "POSTPONED", "CANCELLED"] },
      },
      orderBy: { matchDate: "asc" },
      take: 10,
    });

    if (matches.length === 0) {
      console.log("   ℹ️ Nenhum jogo encontrado no banco");
    } else {
      for (const match of matches) {
        const date = new Date(match.matchDate);
        const dateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        console.log(
          `   ${match.status === "POSTPONED" ? "⚠️" : match.status === "CANCELLED" ? "❌" : "⏰"} ${match.homeTeam} x ${match.awayTeam} - ${dateStr} (${match.status})`,
        );
      }
    }

    console.log("\n🔍 Executando verificação de jogos adiados...\n");

    const result = await checkPostponedGames();

    console.log("\n📊 Resultado da verificação:");
    console.log(`   ⚠️ Adiados/Cancelados: ${result.postponed}`);
    console.log(`   ✅ Remarcados: ${result.rescheduled}`);

    if (result.postponed === 0 && result.rescheduled === 0) {
      console.log(
        "\n✅ Nenhuma alteração detectada - todos os jogos estão em dia!",
      );
    }

    console.log("\n✅ Teste concluído!");
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testPostponedGames();
