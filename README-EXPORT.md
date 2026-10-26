# README-EXPORT — FolioAtlas Export Package Guidance

**Package:** `folioatlas-export-<date>.zip` · **Generated:** 2026-10-27 (see each file's own timestamp)
**What this is:** a complete, self-contained snapshot of the FolioAtlas project — full source
code, the live database (raw + portable dump + JSON), seed artifacts, backups, environment
files, and the full documentation suite.

---

## 1. Package map

```
folioatlas-export-<date>/
├── folioatlas/                     # THE CODEBASE — cd here to work/build/deploy
│   ├── src/                        # Next.js 16 app (views, API routes, pipeline, AI layer)
│   ├── prisma/schema.prisma        # persistence schema (5 models)
│   ├── supabase/                   # optional Postgres/Supabase production kit (documented)
│   ├── scripts/                    # sync-portfolios, seed-db, generate-og, db-inspect, dump-db
│   ├── tests/unit/                 # 74 unit tests (bun test)
│   ├── src/data/                   # generated artifacts: portfolios + sync report (2,072 entries)
│   ├── db/custom.db                # the SQLite database as committed in the repo
│   ├── docs (root)                 # README.md · PRD.md · agent.md · CHANGELOG.md ·
│   │                               # QA_STATUS.md · TEST_BACKLOG.md · worklog.md
│   └── upload/PRD.md               # the original frozen master brief
├── database/
│   ├── folioatlas-sqlite.db        # raw SQLite DB copy — 2,072 portfolios, 3,714 snapshots,
│   │                               #   147 previews, 2 AI summaries, 3 sync runs
│   ├── folioatlas-sqlite.sql       # portable SQL dump (schema + data, transactional, verified
│   │                               #   via restore round-trip)
│   └── json-exports/               # one JSON array per table + manifest.json (row counts)
├── seeds/
│   ├── portfolios.generated.json   # upstream index snapshot (input to scripts/seed-db.ts)
│   └── sync-report.generated.json  # sync provenance report for that snapshot
├── backups/
│   ├── custom-<ts>.db              # timestamped SQLite backup (file-level restore)
│   ├── data-artifacts-<ts>.tar.gz  # src/data + prisma schema + supabase kit + .env.example
│   └── folioatlas-git-<ts>.bundle  # FULL git history — clone/restore the repo from it
├── env/
│   ├── .env                        # the actual env file used in the sandbox (no secrets —
│   │                               #   contains only an absolute DATABASE_URL; fix path on restore)
│   ├── .env.portable               # recommended: relative-path DATABASE_URL variant
│   └── .env.example                # fully annotated reference for ALL optional vars
└── README-EXPORT.md                # this guidance
```

## 2. Requirements

- **Bun ≥ 1.1** (https://bun.sh) — runtime for scripts, tests, and dev. Node 20+ works for
  build/start if you prefer, but scripts in this repo assume `bun`.
- ~400 MB disk for dependencies (`bun install`).
- Optional external services (all gracefully degrading — the app runs fully without them):
  Groq API key (AI search/summaries), ScreenshotOne key (previews), Supabase project (production
  Postgres). See §5.

## 3. Quick start (3 commands + 1 env file)

```bash
cd folioatlas-export-<date>/folioatlas
cp ../env/.env.portable .env        # portable DATABASE_URL (relative path is correct)
bun install
bun run dev                         # → http://localhost:3000
```

The repo ships with `db/custom.db` present, so the app works immediately. If you skipped copying
the env file, create one (see §4) — without `DATABASE_URL` Prisma cannot connect.

## 4. Database restore — choose ONE path

| Path | When to use | Steps |
|---|---|---|
| **A. Raw file** (fastest) | You want the exact working DB | `cp ../database/folioatlas-sqlite.db db/custom.db` |
| **B. SQL dump** | You want to inspect/port to another SQLite or edit before load | `sqlite3 db/custom.db < ../database/folioatlas-sqlite.sql` (or load with any SQLite lib — the dump is a single `BEGIN…COMMIT` transaction) |
| **C. Re-seed from artifacts** | You want to rebuild + re-verify provenance (walks real upstream git history, ~3.7k commits; needs network) | `cp ../seeds/*.json src/data/` then `bun scripts/seed-db.ts` |

Then verify:

```bash
bun run db:push                 # confirms schema matches prisma/schema.prisma
bun scripts/db-inspect.ts       # expect: Portfolio 2072, PortfolioCountSnapshot 3714
bun run build && bun run start  # production check; curl http://localhost:3000/api/stats
```

> **Note on env paths:** Prisma resolves relative SQLite URLs against `prisma/schema.prisma`.
> `file:../db/custom.db` → `<project>/db/custom.db` ✔. The sandbox `.env` (in `env/.env`) uses an
> absolute path (`file:/home/z/my-project/db/custom.db`) — update it if your checkout lives
> elsewhere, or just use `.env.portable`.

## 5. Environment variables & credentials

`.env.example` (also inside `folioatlas/`) is the annotated master list. Priority order:

| Variable | Need | Effect when set |
|---|---|---|
| `DATABASE_URL` | **Required** | SQLite location (see §4) |
| `NEXT_PUBLIC_SITE_URL` | prod | canonical origin for metadata/sitemap/JSON-LD |
| `GROQ_API_KEY`, `GROQ_MODEL` | optional | real Groq for AI search intents + summaries (server-only). Without it: built-in fallback provider, then plain keyword search. **Verified behavior in this snapshot used the fallback; the Groq path is code-complete but untested with a real key** |
| `PREVIEW_PROVIDER`, `SCREENSHOT_ONE_ACCESS_KEY` | optional | `none` disables previews; default public provider needs no key; ScreenshotOne key upgrades quality (server-side only) |
| `NEXT_PUBLIC_SUPABASE_URL/_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | optional | production Postgres path — run `supabase/migrations/0001_init.sql` first; full 6-step guide in `folioatlas/supabase/README.md`. **Kit is unverified against a live instance** |
| `GITHUB_TOKEN` (+ `GITHUB_OWNER/REPO/REF/README_PATH`) | optional | upstream sync rate-limit headroom |

**Security invariants:** server-only secrets must never be prefixed `NEXT_PUBLIC_`; preview URLs
resolve server-side and redirect via `/api/preview/[slug]`; the client bundle contains no tokens
(enforced + tested).

## 6. Backups & disaster recovery drills

- **Restore the repo (including all history):**
  `git clone backups/folioatlas-git-<ts>.bundle restored-folioatlas && cd restored-folioatlas`
- **Point-in-time data restore:** copy `backups/custom-<ts>.db` over `folioatlas/db/custom.db`.
- **Config/data drift restore:** untar `backups/data-artifacts-<ts>.tar.gz` over the checkout,
  then re-run `bun scripts/seed-db.ts` for a provenance-verified rebuild.
- **Routine backup (from a live checkout):** `git bundle create folio-$(date +%F).bundle --all`
  plus `cp db/custom.db backups/custom-$(date +%F-%H%M).db`. The sync pipeline is append-only by
  design — a failed sync never deletes data, so file-level backups are always consistent.

## 7. Verification checklist after restore

- [ ] `bun test` → 74/74 pass
- [ ] `bun run lint` → 0 problems · `bunx tsc --noEmit` → 0 errors
- [ ] `bun run build` → success (13 routes)
- [ ] `bun scripts/db-inspect.ts` → Portfolio 2,072 / snapshots 3,714
- [ ] `curl -s localhost:3000/api/stats | head -c 400` → real numbers, 200 OK
- [ ] UI smoke: home stats + growth chart render; `#/portfolios?q=react` returns 62 results;
      open any detail page (preview + AI summary labeled); `⌘K` palette opens
- [ ] `curl -s localhost:3000/robots.txt` and `/sitemap.xml` respond

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Prisma error "does not exist in the database / file not found" | Wrong relative path or missing `db/` dir → use `.env.portable`, run `bun run db:push` |
| AI search silently returns keyword results | No AI provider configured — expected graceful degradation; set `GROQ_API_KEY` for Groq |
| Previews show "unavailable" | `PREVIEW_PROVIDER=none` set, or provider blocked — explicit state by design, never a fake screenshot |
| Growth chart window looks short | Honest coverage labeling — the chart only renders verified snapshot ranges (2019-09-13 → 2026-10-26 in this snapshot) |
| `bun test` mentions `bun:test` module resolution in your IDE | Bun resolves it at runtime; for editors, keep the `/// <reference types="bun-types" />` line each test file already has |
| Sandbox-hosted deployments serving only `/` | The app is a hash-routed SPA on purpose; full path routes when your host allows — see `folioatlas/README.md` §Deployment |

## 9. Where to read next (inside `folioatlas/`)

1. `README.md` — features, pipeline architecture, deployment, shortcuts
2. `agent.md` — repo map + data-honesty red lines if you (or an agent) will modify code
3. `PRD.md` — living requirements vs. implemented status
4. `QA_STATUS.md` / `TEST_BACKLOG.md` — what is verified, what is pending
5. `CHANGELOG.md` — release history · `worklog.md` — phase-by-phase build record
