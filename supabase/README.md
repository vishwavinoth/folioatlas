# FolioAtlas — Supabase setup

Supabase (Postgres + Row Level Security) is FolioAtlas's only database. The app
reads with the publishable key (RLS: public read) and writes AI summaries with the
service-role key on the server. The directory data itself is written only by
`scripts/seed-db.ts`.

## Files

| File | Purpose |
|---|---|
| `migrations/0001_init.sql` | Schema: `portfolios`, `portfolio_ai_summaries`, `sync_runs`, `portfolio_count_snapshots` with constraints, indexes, GIN technology index and **Row Level Security** (public read, no public writes). |
| `migrations/0002_api_grants.sql` | Explicit Data API grants (read for `anon`/`authenticated`, full for `service_role`). Required on newer projects that no longer grant table access automatically. |
| `migrations/0003_engagement.sql` | Likes, views and site visits: two locked-down tables (RLS, no Data API access), public aggregate functions and service-role-only write functions. |

All migrations are idempotent — re-running them is safe.

## Setup

1. **Create a project** at https://supabase.com/dashboard.

2. **Apply the migrations**, in order — either paste each file into the SQL editor and
   run it, or use the CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

3. **Collect the keys** — Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL` — project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable / anon key (read-only under RLS)
   - `SUPABASE_SECRET_KEY` — service-role / secret key (**server-only**)

4. **Load the data** (one-time; ~1 minute, clones the upstream repo to replay its history):
   ```bash
   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=... bun run db:seed
   ```
   Expected output ends with `DONE — portfolios: 2072 …`.

5. **Automate future syncs** — add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as GitHub
   repository secrets. `.github/workflows/sync-database.yml` then re-syncs Supabase whenever a
   data PR is merged (and on manual dispatch).

6. **Configure the app** — set the three keys (plus `NEXT_PUBLIC_SITE_URL`) in Vercel →
   Settings → Environment Variables and redeploy. `GET /api` should return
   `{"status":"ok","portfolios":2072}`.

## Verify RLS before going public

```sql
select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public';
```

All five tables must show a `public read …` SELECT policy for `anon, authenticated` and
no INSERT/UPDATE/DELETE policies. Writes must fail with the publishable key and succeed
only with the service-role key.

## Security invariants

- The service-role key lives **only** in server-side environment variables (Vercel env,
  GitHub Actions secrets). It is never prefixed with `NEXT_PUBLIC_` or bundled into client code.
- The publishable key grants read-only access under the RLS policies above.
- Never disable RLS on these tables.
