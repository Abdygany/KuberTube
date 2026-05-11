import { serve } from '@hono/node-server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { createAuth } from './auth.js';
import { createContext } from './context.js';
import { getDb } from './db.js';
import { loadEnv } from './env.js';
import { appRouter } from './router.js';

const env = loadEnv();
const db = getDb(env.DATABASE_URL);
const auth = createAuth(db, env);

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  }),
);

app.get('/health', (c) => c.json({ ok: true, at: new Date().toISOString() }));

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

app.all('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext({ db, env, auth, headers: c.req.raw.headers }),
  }),
);

const server = serve(
  { fetch: app.fetch, port: env.PORT },
  ({ port }) => {
    console.warn(`Learnspace API listening on http://localhost:${port}`);
  },
);

const shutdown = (signal: NodeJS.Signals) => {
  console.warn(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
