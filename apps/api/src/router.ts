import { apiKeysRouter } from './routers/api-keys.js';
import { healthRouter } from './routers/health.js';
import { meRouter } from './routers/me.js';
import { settingsRouter } from './routers/settings.js';
import { workspacesRouter } from './routers/workspaces.js';
import { router } from './trpc.js';

export const appRouter = router({
  health: healthRouter,
  me: meRouter,
  settings: settingsRouter,
  apiKeys: apiKeysRouter,
  workspaces: workspacesRouter,
});

export type AppRouter = typeof appRouter;
