import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { createDb, schema } from '@learnspace/db';
import { and, isNotNull, lt } from 'drizzle-orm';
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

app.post('/api/cron/cleanup', async (c) => {
  if (env.CRON_SECRET) {
    const auth_header = c.req.header('authorization');
    if (auth_header !== `Bearer ${env.CRON_SECRET}`) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }

  const db = createDb();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const condition = and(isNotNull(schema.workspaces.deletedAt), lt(schema.workspaces.deletedAt, cutoff));

  const deleted = await db
    .delete(schema.workspaces)
    .where(condition)
    .returning({ id: schema.workspaces.id });

  return c.json({ ok: true, deletedWorkspaces: deleted.length, cutoff: cutoff.toISOString() });
});

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
