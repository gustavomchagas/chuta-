import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findFlavio() {
  const players = await prisma.player.findMany({
    where: {
      name: {
        contains: "flavio",
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  console.log("Jogadores encontrados:");
  console.log("=".repeat(80));

  players.forEach((player) => {
    console.log(`ID: ${player.id}`);
    console.log(`Nome: ${player.name}`);
    console.log(`Phone: ${player.phone}`);
    console.log("-".repeat(80));
  });

  await prisma.$disconnect();
}

findFlavio().catch(console.error);
