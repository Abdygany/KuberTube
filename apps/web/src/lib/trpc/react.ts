import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@kubertube/api-types";

export const trpc = createTRPCReact<AppRouter>();
