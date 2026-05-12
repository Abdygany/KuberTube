import { router } from "../trpc";
import { userRouter } from "./user";
import { settingsRouter } from "./settings";
import { keysRouter } from "./keys";
import { workspacesRouter } from "./workspaces";

export const appRouter = router({
  user: userRouter,
  settings: settingsRouter,
  keys: keysRouter,
  workspaces: workspacesRouter,
});

export type AppRouter = typeof appRouter;
