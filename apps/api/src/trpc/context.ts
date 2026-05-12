import { getDb, type Database } from "@kubertube/db";
import { auth } from "../auth";
import { env } from "../env";

export interface Context {
  db: Database;
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  masterKey: Buffer;
}

export async function createContext({ req }: { req: Request }): Promise<Context> {
  const session = await auth.api.getSession({ headers: req.headers });
  return {
    db: getDb(env.DATABASE_URL),
    session,
    masterKey: env.MASTER_KEY,
  };
}
