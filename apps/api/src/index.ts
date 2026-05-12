import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { env } from "./env";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/routers/_app";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: env.WEB_URL,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "kubertube-api" }));

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.all("/trpc/*", (c) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: ({ req }) => createContext({ req }),
    onError({ error, path }) {
      if (process.env.NODE_ENV !== "production") {
        console.error(`[trpc] ${path}: ${error.message}`);
      }
    },
  }),
);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`);
});
