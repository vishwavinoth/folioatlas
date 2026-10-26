# FolioAtlas — Supabase setup (optional, for production deployment)

FolioAtlas runs **out of the box on a local Prisma/SQLite database** (`db/custom.db`).
This directory contains everything needed to move the same data model to
Supabase Postgres in production. **The remote database was NOT configured or
verified in this environment** — no Supabase credentials exist here. Follow the
steps below on a machine that has them.

## What is provided

| File | Purpose |
|---|---|
| `migrations/0001_init.sql` | Full schema: `portfolios`, `portfolio_ai_summaries`, `portfolio_previews`, `sync_runs`, `portfolio_count_snapshots` with constraints, indexes, GIN technology index and **Row Level Security** (public read, service-role-only writes). |

The SQL mirrors `prisma/schema.prisma` 1:1 (SQLite ↔ Postgres), including the
`provenance` column that keeps growth-chart history trustworthy.

## Setup steps (on a machine with Supabase access)

1. **Create the project** at https://supabase.com/dashboard (or `supabase init && supabase link`).

2. **Apply the migration**
   ```bash
   # via CLI
   supabase db push
   # or via SQL editor / psql
   psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
   ```

3. **Collect connection info** — Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL` (project URL — safe for the browser)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key — safe for the browser, read-only under RLS)
   - `SUPABASE_SERVICE_ROLE_KEY` (**server-only** — bypasses RLS; never ship to the client)

4. **Populate the database.** Two options:
   - Seed from the verified git history (recommended, matches the local layer):
     adapt `scripts/seed-db.ts` by swapping the Prisma client for the Supabase
     one — the table/column names are identical.
   - Or import `src/data/portfolios.generated.json` with a small ETL script,
     then let the first scheduled sync create the sync-run snapshot.

5. **Wire the sync job.** The GitHub Action (`.github/workflows/sync-portfolios.yml`)
   regenerates the JSON artifacts daily. For Supabase, extend it with a step
   that runs the DB sync (upsert + `sync_runs` + `portfolio_count_snapshots`)
   using the service-role key as a repository secret.

6. **Verify RLS** before going public:
   ```sql
   select * from pg_policies where schemaname = 'public';
   ```
   All five tables must show `public read …` SELECT policies for `anon` and
   no INSERT/UPDATE/DELETE policies. Writes must fail with the anon key and
   succeed only with the service-role key.

## Security invariants

- The service-role key lives **only** in server-side environment variables
  (GitHub Actions secrets / your host's env config). It is never bundled into
  client code.
- The anon key grants read-only access under the RLS policies above.
- All FolioAtlas API routes that write (AI summaries, previews, sync) run
  server-side; the browser talks only to FolioAtlas's own API routes.
