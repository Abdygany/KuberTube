import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let cachedPool: Pool | null = null;

function getPool(): Pool {
  if (cachedPool) return cachedPool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  cachedPool = new Pool({ connectionString: url });
  return cachedPool;
}

export function createDb() {
  return drizzle(getPool(), { schema });
}

export type Database = ReturnType<typeof createDb>;
