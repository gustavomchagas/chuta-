/**
 * Script para limpar o banco de dados antes de ir para produção
 *
 * ⚠️ ATENÇÃO: Este script apaga TODOS os dados!
 * Use apenas antes de conectar o WhatsApp de produção.
 *
 * Como usar:
 * npx tsx clean-database.ts
 */

import { prisma } from "./src/lib/prisma";

async function cleanDatabase() {
  console.log("\n" + "=".repeat(60));
  console.log("🧹 LIMPEZA DE BANCO DE DADOS - PREPARAÇÃO PARA PRODUÇÃO");
  console.log("=".repeat(60) + "\n");

  console.log("⚠️  ATENÇÃO: Você está prestes a apagar TODOS os dados!\n");
  console.log("Isso inclui:");
  console.log("  • Todos os jogadores");
  console.log("  • Todos os jogos");
  console.log("  • Todas as apostas");
  console.log("  • Todas as notificações");
  console.log("  • Todos os grupos\n");

  console.log(
    "Aguardando 5 segundos para cancelar... (Ctrl+C para cancelar)\n",
  );

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("🚀 Iniciando limpeza...\n");

  try {
    // Apaga tudo em ordem (devido a foreign keys)

    console.log("📝 Apagando apostas...");
    const bets = await prisma.bet.deleteMany();
    console.log(`   ✅ ${bets.count} apostas apagadas\n`);

    console.log("🔔 Apagando notificações...");
    const notifications = await prisma.notification.deleteMany();
    console.log(`   ✅ ${notifications.count} notificações apagadas\n`);

    console.log("⚽ Apagando jogos...");
    const matches = await prisma.match.deleteMany();
    console.log(`   ✅ ${matches.count} jogos apagados\n`);

    console.log("👥 Apagando jogadores...");
    const players = await prisma.player.deleteMany();
    console.log(`   ✅ ${players.count} jogadores apagados\n`);

    console.log("📱 Apagando grupos...");
    const groups = await prisma.group.deleteMany();
    console.log(`   ✅ ${groups.count} grupos apagados\n`);

    console.log("=".repeat(60));
    console.log("🎉 Banco de dados limpo com sucesso!");
    console.log("=".repeat(60) + "\n");

    console.log("📋 PRÓXIMOS PASSOS:\n");
    console.log("1. ✅ Banco de dados limpo");
    console.log("2. ⏳ Apague a pasta 'auth_info_baileys':");
    console.log(
      "   Windows: Remove-Item -Path 'auth_info_baileys' -Recurse -Force",
    );
    console.log("   Linux:   rm -rf auth_info_baileys");
    console.log("3. ⏳ Desconecte o WhatsApp de teste no celular");
    console.log("4. ⏳ Inicie o bot: npm run bot");
    console.log("5. ⏳ Escaneie QR Code com o novo número");
    console.log("6. ⏳ No grupo, execute: !setupgrupo");
    console.log("7. ⏳ Sincronize rodada: !proxima\n");

    console.log("🎯 Seu bot estará pronto para produção!\n");
  } catch (error) {
    console.error("\n❌ Erro ao limpar banco de dados:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
