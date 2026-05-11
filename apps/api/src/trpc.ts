import { initTRPC, TRPCError } from '@trpc/server';

import type { TrpcContext } from './context.js';

const t = initTRPC.context<TrpcContext>().create({
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      cause: error.cause instanceof Error ? error.cause.message : undefined,
    },
  }),
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in required' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
