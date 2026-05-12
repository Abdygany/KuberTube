import { router } from "../trpc";
import { userRouter } from "./user";
import { settingsRouter } from "./settings";
import { keysRouter } from "./keys";
import { workspacesRouter } from "./workspaces";
import { searchRouter } from "./search";
import { resourcesRouter } from "./resources";
import { notesRouter } from "./notes";
import { readerRouter } from "./reader";
import { summariesRouter } from "./summaries";

export const appRouter = router({
  user: userRouter,
  settings: settingsRouter,
  keys: keysRouter,
  workspaces: workspacesRouter,
  search: searchRouter,
  resources: resourcesRouter,
  notes: notesRouter,
  reader: readerRouter,
  summaries: summariesRouter,
});

export type AppRouter = typeof appRouter;
