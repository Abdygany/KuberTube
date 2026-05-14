# Drizzle migrations

`pnpm db:migrate` runs the SQL files here against `DATABASE_URL`. The
migrator reads `meta/_journal.json` + the `.sql` files; it does **not**
need `meta/0000_snapshot.json` to apply migrations.

`pnpm db:generate` is a different beast — it diffs your `schema/*.ts`
against the latest `meta/NNNN_snapshot.json` to emit the next migration.
This directory ships `0000_initial.sql` hand-written from the schema
without a snapshot, so the first `pnpm db:generate` you run will emit a
full re-create migration that collides with `0000_initial`.

**Recommended flow:**

- **Hosting / production**: run `pnpm db:migrate` once on a fresh DB.
  This applies `0000_initial.sql` cleanly.
- **Local dev**: use `pnpm db:push` instead — it syncs the schema
  directly with no journal. Faster iteration when you're tweaking
  schema files.
- **Adding the next migration**: run `pnpm db:generate` against an
  **empty** DB. Drizzle-kit will emit `0000_initial.sql` + its
  matching `meta/0000_snapshot.json`. Replace the hand-written files
  with the generated pair, then commit. From that point on the
  journal is in sync and incremental `pnpm db:generate` produces
  proper diffs.
