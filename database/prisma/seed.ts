import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLES = [
  "super_admin",
  "tournament_admin",
  "district_manager",
  "team_manager",
  "referee",
  "player",
  "spectator",
] as const;

async function main() {
  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${ROLES.length} roles.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
