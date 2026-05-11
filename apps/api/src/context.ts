import type { Auth } from './auth.js';
import type { Database } from '@learnspace/db';
import type { Env } from './env.js';

export type TrpcContext = {
  db: Database;
  env: Env;
  auth: Auth;
  session: Awaited<ReturnType<Auth['api']['getSession']>>;
  user: Awaited<ReturnType<Auth['api']['getSession']>> extends infer S
    ? S extends { user: infer U }
      ? U
      : null
    : null;
};

export async function createContext({
  db,
  env,
  auth,
  headers,
}: {
  db: Database;
  env: Env;
  auth: Auth;
  headers: Headers;
}): Promise<TrpcContext> {
  const session = await auth.api.getSession({ headers });
  return {
    db,
    env,
    auth,
    session,
    user: (session?.user ?? null) as TrpcContext['user'],
  };
}
