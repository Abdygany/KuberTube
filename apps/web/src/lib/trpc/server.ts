import "server-only";

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { cookies } from "next/headers";
import superjson from "superjson";
import type { AppRouter } from "@kubertube/api-types";
import { TRPC_URL } from "./shared";

/**
 * Server-side tRPC client for Next.js RSC and server actions.
 *
 * Forwards the browser's cookies to the API so Better Auth can resolve
 * the session. Always call this fresh per request — never cache across
 * users.
 */
export async function createServerTrpc() {
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
}
