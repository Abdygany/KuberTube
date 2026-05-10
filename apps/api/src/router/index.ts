import { publicProcedure, router } from '../trpc';
import { keysRouter } from './keys';
import { notesRouter } from './notes';
import { readerRouter } from './reader';
import { resourcesRouter } from './resources';
import { searchRouter } from './search';
import { userRouter } from './user';
import { workspacesRouter } from './workspaces';

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, ts: new Date().toISOString() })),
  user: userRouter,
  keys: keysRouter,
  workspaces: workspacesRouter,
  resources: resourcesRouter,
  notes: notesRouter,
  search: searchRouter,
  reader: readerRouter,
});

export type AppRouter = typeof appRouter;
