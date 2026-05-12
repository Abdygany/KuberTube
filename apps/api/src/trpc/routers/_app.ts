import { router } from "../trpc";
import { userRouter } from "./user";
import { settingsRouter } from "./settings";
import { keysRouter } from "./keys";
import { workspacesRouter } from "./workspaces";
import { searchRouter } from "./search";
import { resourcesRouter } from "./resources";

export const appRouter = router({
  user: userRouter,
  settings: settingsRouter,
  keys: keysRouter,
  workspaces: workspacesRouter,
  search: searchRouter,
  resources: resourcesRouter,
});

export type AppRouter = typeof appRouter;
