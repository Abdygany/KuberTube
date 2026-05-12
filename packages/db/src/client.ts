import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

let cached: { pool: pg.Pool; db: Database } | undefined;

export function getDb(databaseUrl: string = requireDatabaseUrl()): Database {
  if (cached) return cached.db;
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  cached = { pool, db };
  return db;
}

export function getPool(): pg.Pool {
  if (!cached) getDb();
  return cached!.pool;
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required but was not set");
  }
  return url;
}
