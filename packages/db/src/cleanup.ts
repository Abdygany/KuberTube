import "dotenv/config";
import { and, isNotNull, lt } from "drizzle-orm";
import { notes, resources, workspaces } from "./schema";
import { getDb, getPool } from "./client";

const RETENTION_DAYS = Number(process.env.SOFT_DELETE_RETENTION_DAYS ?? 30);

/**
 * Physical deletion of rows soft-deleted more than RETENTION_DAYS ago.
 *
 * Run on a schedule (Railway cron, GitHub Actions, pg_cron) — see
 * /docs/self-host.
 *
 * Order matters for accurate row counts: workspaces first so the FK
 * cascade nukes their resources + notes in one shot. Subsequent
 * passes mop up resources / notes that were soft-deleted individually
 * (a single resource removed by the user from a still-live workspace,
 * a single note removed from a live resource). Wrapped in a single
 * transaction so a partial failure doesn't leave half-purged state.
 */
async function main() {
  const db = getDb();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  console.log(
    `Purging soft-deleted rows older than ${cutoff.toISOString()} (retention: ${RETENTION_DAYS}d)`,
  );

  try {
    await db.transaction(async (tx) => {
      const workspaceResult = await tx
        .delete(workspaces)
        .where(
          and(
            isNotNull(workspaces.deletedAt),
            lt(workspaces.deletedAt, cutoff),
          ),
        );
      console.log(
        `  workspaces purged: ${workspaceResult.rowCount ?? 0} (cascades to children)`,
      );

      const resourceResult = await tx
        .delete(resources)
        .where(
          and(isNotNull(resources.deletedAt), lt(resources.deletedAt, cutoff)),
        );
      console.log(
        `  resources purged (orphans): ${resourceResult.rowCount ?? 0}`,
      );

      const noteResult = await tx
        .delete(notes)
        .where(and(isNotNull(notes.deletedAt), lt(notes.deletedAt, cutoff)));
      console.log(`  notes purged (orphans): ${noteResult.rowCount ?? 0}`);
    });
  } finally {
    await getPool().end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
