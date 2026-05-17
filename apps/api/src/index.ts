import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { sql } from "drizzle-orm";
import { getDb } from "@kubertube/db";
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

/**
 * Liveness probe — always 200. Use this for orchestrator restart
 * signals (Railway healthcheck, Kubernetes liveness).
 */
app.get("/health", (c) => c.json({ ok: true, service: "kubertube-api" }));

/**
 * Readiness probe — 200 only when the DB is reachable. Slower than
 * /health (~10ms with a healthy pool); use this for deploy-time
 * gating and traffic-shifting. The underlying error is logged
 * server-side; the response intentionally never echoes it so an
 * unauthenticated probe can't enumerate internal hostnames / role
 * names from Postgres error strings.
 */
app.get("/health/ready", async (c) => {
  try {
    const db = getDb(env.DATABASE_URL);
    await db.execute(sql`select 1`);
    return c.json({ ok: true, service: "kubertube-api", db: "ok" });
  } catch (err) {
    console.error("[health/ready] db check failed:", err);
    return c.json(
      { ok: false, service: "kubertube-api", db: "unreachable" },
      503,
    );
  }
});

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
