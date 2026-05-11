import { healthRouter } from './routers/health.js';
import { meRouter } from './routers/me.js';
import { router } from './trpc.js';

export const appRouter = router({
  health: healthRouter,
  me: meRouter,
});

export type AppRouter = typeof appRouter;
