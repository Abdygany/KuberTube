import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './auth';
import { env } from './env';
import { appRouter } from './router';
import { createContext } from './trpc';

const app = new Hono();

app.use('*', logger());

app.use(
  '*',
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

app.get('/', (c) => c.json({ ok: true, service: 'learnspace-api' }));

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

app.use(
  '/trpc/*',
  trpcServer({
    endpoint: '/trpc',
    router: appRouter,
    createContext: (opts) => createContext(opts),
  }),
);

const port = env.PORT;
console.log(`learnspace api listening on http://localhost:${port}`);

serve({ fetch: app.fetch, port });

export type { AppRouter } from './router';
