import { protectedProcedure, router } from '../trpc.js';

export const meRouter = router({
  whoami: protectedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    email: ctx.user.email,
    name: ctx.user.name,
  })),
});
