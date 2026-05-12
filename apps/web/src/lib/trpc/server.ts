import "server-only";

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { cookies } from "next/headers";
import { cache } from "react";
import superjson from "superjson";
import type { AppRouter } from "@kubertube/api-types";
import { TRPC_URL } from "./shared";

/**
 * Per-request memoized tRPC client. React's `cache()` dedupes across
 * server components in the same request, so multiple layouts/pages
 * share one client (and thus one `httpBatchLink` batch window).
 */
export const createServerTrpc = cache(async () => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: TRPC_URL,
        transformer: superjson,
        headers() {
          return cookieHeader ? { cookie: cookieHeader } : {};
        },
      }),
    ],
  });
});

/** Cached bootstrap fetch reused by nested layouts in the same render. */
export const getUserBootstrap = cache(async () => {
  const trpc = await createServerTrpc();
  return trpc.user.bootstrap.query();
});
