import { prisma } from "../src/db/prisma";

async function clearDatabase() {
  console.log("🧹 Fetching all public tables to truncate...");

  const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    "SELECT table_name::text FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != '_prisma_migrations';"
  );

  console.log(`Found ${tables.length} tables to clear.`);

  if (tables.length === 0) {
    console.log("No tables found.");
    return;
  }

  // Construct single cascading truncate query for speed and foreign key handling
  const tableList = tables.map((t) => `"public"."${t.table_name}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} CASCADE;`);

  for (const t of tables) {
    console.log(`  ✓ Cleared table: ${t.table_name}`);
  }

  console.log("✨ All database tables are now completely blank with schema intact.");
}

clearDatabase()
  .catch((err) => {
    console.error("❌ Failed to clear database:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
