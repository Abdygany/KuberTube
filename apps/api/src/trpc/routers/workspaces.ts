import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { notes, resources, workspaces } from "@kubertube/db";
import { workspaceFiltersSchema } from "@kubertube/core";
import { formatSeconds } from "@kubertube/core/format";
import { slugify } from "@kubertube/core/slug";
import { htmlToMarkdown } from "../../lib/text";
import { protectedProcedure, router } from "../trpc";

const createInput = z.object({
  title: z.string().min(1).max(140),
  goal: z.string().min(1).max(4000),
  filters: workspaceFiltersSchema,
});

const updateInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(140).optional(),
  goal: z.string().min(1).max(4000).optional(),
  filters: workspaceFiltersSchema.optional(),
});

export const workspacesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: workspaces.id,
        title: workspaces.title,
        goal: workspaces.goal,
        filtersJson: workspaces.filtersJson,
        createdAt: workspaces.createdAt,
        lastOpenedAt: workspaces.lastOpenedAt,
      })
      .from(workspaces)
      .where(
        and(eq(workspaces.userId, ctx.user.id), isNull(workspaces.deletedAt)),
      )
      .orderBy(desc(workspaces.lastOpenedAt));
    return rows;
  }),

  listDeleted: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: workspaces.id,
        title: workspaces.title,
        goal: workspaces.goal,
        deletedAt: workspaces.deletedAt,
      })
      .from(workspaces)
      .where(
        and(
          eq(workspaces.userId, ctx.user.id),
          isNotNull(workspaces.deletedAt),
        ),
      )
      .orderBy(desc(workspaces.deletedAt));
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          id: workspaces.id,
          title: workspaces.title,
          goal: workspaces.goal,
          filtersJson: workspaces.filtersJson,
          createdAt: workspaces.createdAt,
          lastOpenedAt: workspaces.lastOpenedAt,
        })
        .from(workspaces)
        .where(
          and(
            eq(workspaces.id, input.id),
            eq(workspaces.userId, ctx.user.id),
            isNull(workspaces.deletedAt),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(workspaces)
        .values({
          userId: ctx.user.id,
          title: input.title,
          goal: input.goal,
          filtersJson: input.filters,
        })
        .returning();
      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return created;
    }),

  update: protectedProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (rest.title !== undefined) patch.title = rest.title;
      if (rest.goal !== undefined) patch.goal = rest.goal;
      if (rest.filters !== undefined) patch.filtersJson = rest.filters;
      const [updated] = await ctx.db
        .update(workspaces)
        .set(patch)
        .where(
          and(
            eq(workspaces.id, id),
            eq(workspaces.userId, ctx.user.id),
            isNull(workspaces.deletedAt),
          ),
        )
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  touch: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(workspaces)
        .set({ lastOpenedAt: new Date() })
        .where(
          and(
            eq(workspaces.id, input.id),
            eq(workspaces.userId, ctx.user.id),
            isNull(workspaces.deletedAt),
          ),
        );
      return { ok: true as const };
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(workspaces)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(workspaces.id, input.id),
            eq(workspaces.userId, ctx.user.id),
            isNull(workspaces.deletedAt),
          ),
        )
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return { ok: true as const };
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(workspaces)
        .set({ deletedAt: null })
        .where(
          and(eq(workspaces.id, input.id), eq(workspaces.userId, ctx.user.id)),
        )
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  /**
   * Serializes the workspace, its saved resources, and per-resource
   * notes to a markdown string suitable for download. Notes are
   * stored as TipTap HTML (the column is named `content_md` but
   * holds HTML — see notes/router); they're run through
   * `htmlToMarkdown` here.
   */
  exportMarkdown: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [workspace] = await ctx.db
        .select({
          id: workspaces.id,
          title: workspaces.title,
          goal: workspaces.goal,
          filtersJson: workspaces.filtersJson,
          createdAt: workspaces.createdAt,
        })
        .from(workspaces)
        .where(
          and(
            eq(workspaces.id, input.id),
            eq(workspaces.userId, ctx.user.id),
            isNull(workspaces.deletedAt),
          ),
        )
        .limit(1);
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });

      const savedResources = await ctx.db
        .select({
          id: resources.id,
          url: resources.url,
          type: resources.type,
          source: resources.source,
          title: resources.title,
          description: resources.description,
          durationSeconds: resources.durationSeconds,
          publishedAt: resources.publishedAt,
          isCompleted: resources.isCompleted,
        })
        .from(resources)
        .where(
          and(eq(resources.workspaceId, input.id), isNull(resources.deletedAt)),
        )
        .orderBy(asc(resources.savedAt));

      const resourceIds = savedResources.map((r) => r.id);
      const allNotes = resourceIds.length
        ? await ctx.db
            .select({
              id: notes.id,
              resourceId: notes.resourceId,
              contentMd: notes.contentMd,
              timestampSeconds: notes.timestampSeconds,
            })
            .from(notes)
            .where(
              and(
                inArray(notes.resourceId, resourceIds),
                isNull(notes.deletedAt),
              ),
            )
            .orderBy(asc(notes.timestampSeconds), asc(notes.createdAt))
        : [];

      const notesByResource = new Map<string, typeof allNotes>();
      for (const note of allNotes) {
        const list = notesByResource.get(note.resourceId) ?? [];
        list.push(note);
        notesByResource.set(note.resourceId, list);
      }

      const lines: string[] = [];
      lines.push(`# ${workspace.title}`);
      lines.push("");
      lines.push(`> ${workspace.goal.replace(/\n/g, "\n> ")}`);
      lines.push("");
      const filters = workspaceFiltersSchema.safeParse(
        workspace.filtersJson,
      ).data;
      if (filters) {
        lines.push(
          `_Filters: level=${filters.level}, duration=${filters.duration}, balance=${filters.balance}, freshness=${filters.freshness}_`,
        );
        lines.push("");
      }
      lines.push(
        `_Created: ${workspace.createdAt.toISOString().slice(0, 10)}_`,
      );
      lines.push("");
      lines.push("---");
      lines.push("");

      if (savedResources.length === 0) {
        lines.push("_No saved resources._");
      } else {
        lines.push("## Resources");
        lines.push("");
        for (const resource of savedResources) {
          const checkbox = resource.isCompleted ? "x" : " ";
          lines.push(`### [${checkbox}] ${resource.title}`);
          lines.push("");
          const meta: string[] = [
            resource.source === "youtube" ? "YouTube" : "Web",
          ];
          if (resource.durationSeconds)
            meta.push(`${Math.round(resource.durationSeconds / 60)} min`);
          if (resource.publishedAt)
            meta.push(resource.publishedAt.toISOString().slice(0, 10));
          lines.push(`_${meta.join(" · ")}_`);
          lines.push("");
          lines.push(resource.url);
          lines.push("");
          if (resource.description) {
            lines.push(resource.description.trim());
            lines.push("");
          }
          const noteList = notesByResource.get(resource.id) ?? [];
          if (noteList.length > 0) {
            lines.push("**Notes:**");
            lines.push("");
            for (const note of noteList) {
              const md = htmlToMarkdown(note.contentMd).trim();
              if (!md) continue;
              if (note.timestampSeconds === null) {
                lines.push(md);
              } else {
                const t = formatSeconds(note.timestampSeconds);
                lines.push(`- **[${t}]** ${md}`);
              }
              lines.push("");
            }
          }
        }
      }

      return {
        filename: `${slugify(workspace.title)}.md`,
        markdown: lines.join("\n"),
      };
    }),
});
