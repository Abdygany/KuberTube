import { sql } from 'drizzle-orm';

import { publicProcedure, router } from '../trpc.js';

export const healthRouter = router({
  ping: publicProcedure.query(() => ({ ok: true, at: new Date().toISOString() })),

  db: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute<{ ok: number }>(sql`select 1 as ok`);
    return { db: rows.length > 0 ? 'up' : 'down' };
  }),
});
