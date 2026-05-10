import { schema } from '@learnspace/db';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import type { Context } from '../trpc';

type ProtectedCtx = Context & { user: NonNullable<Context['user']> };

export async function assertWorkspaceOwned(
  ctx: ProtectedCtx,
  workspaceId: string,
): Promise<void> {
  const [row] = await ctx.db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(
      and(
        eq(schema.workspaces.id, workspaceId),
        eq(schema.workspaces.userId, ctx.user.id),
      ),
    );
  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });
  }
}

export async function assertResourceOwned(
  ctx: ProtectedCtx,
  resourceId: string,
): Promise<{ resourceId: string; workspaceId: string }> {
  const [row] = await ctx.db
    .select({
      resourceId: schema.resources.id,
      workspaceId: schema.resources.workspaceId,
    })
    .from(schema.resources)
    .innerJoin(schema.workspaces, eq(schema.resources.workspaceId, schema.workspaces.id))
    .where(
      and(
        eq(schema.resources.id, resourceId),
        eq(schema.workspaces.userId, ctx.user.id),
      ),
    );
  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });
  }
  return row;
}

export async function assertNoteOwned(ctx: ProtectedCtx, noteId: string): Promise<void> {
  const [row] = await ctx.db
    .select({ id: schema.notes.id })
    .from(schema.notes)
    .innerJoin(schema.resources, eq(schema.notes.resourceId, schema.resources.id))
    .innerJoin(schema.workspaces, eq(schema.resources.workspaceId, schema.workspaces.id))
    .where(
      and(
        eq(schema.notes.id, noteId),
        eq(schema.workspaces.userId, ctx.user.id),
      ),
    );
  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' });
  }
}
