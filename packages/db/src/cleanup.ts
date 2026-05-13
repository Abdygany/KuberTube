import "dotenv/config";
import { and, isNotNull, lt } from "drizzle-orm";
import { notes, resources, workspaces } from "./schema";
import { getDb, getPool } from "./client";

const RETENTION_DAYS = Number(process.env.SOFT_DELETE_RETENTION_DAYS ?? 30);

/**
 * Physical deletion of rows soft-deleted more than RETENTION_DAYS ago.
 *
 * Run on a schedule (Railway cron, GitHub Actions, pg_cron) — see
 * /docs/self-host. Cascade fans out from workspaces → resources →
 * notes / search_queries / search_results_cache, but a directly
 * soft-deleted resource doesn't kill its workspace, so we walk all
 * three tables.
 */
async function main() {
  const db = getDb();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  console.log(`Purging soft-deleted rows older than ${cutoff.toISOString()} (retention: ${RETENTION_DAYS}d)`);

  const noteResult = await db
    .delete(notes)
    .where(and(isNotNull(notes.deletedAt), lt(notes.deletedAt, cutoff)));
  console.log(`  notes purged: ${noteResult.rowCount ?? 0}`);

  const resourceResult = await db
    .delete(resources)
    .where(and(isNotNull(resources.deletedAt), lt(resources.deletedAt, cutoff)));
  console.log(`  resources purged: ${resourceResult.rowCount ?? 0}`);

  const workspaceResult = await db
    .delete(workspaces)
    .where(and(isNotNull(workspaces.deletedAt), lt(workspaces.deletedAt, cutoff)));
  console.log(`  workspaces purged: ${workspaceResult.rowCount ?? 0}`);

  await getPool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
