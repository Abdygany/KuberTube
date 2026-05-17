import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, getPool } from "./client";

async function main() {
  const db = getDb();
  await migrate(db, { migrationsFolder: "./migrations" });
  await getPool().end();
  console.log("migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
