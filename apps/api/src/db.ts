import { createDb, type Database } from '@learnspace/db';

let cached: Database | undefined;

export function getDb(url: string): Database {
  if (!cached) cached = createDb(url);
  return cached;
}
