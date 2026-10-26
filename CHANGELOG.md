# Changelog

All notable changes to FolioAtlas are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is pragmatic
(0.x while the product ships from the sandbox environment).

## [0.3.0] — 2026-10-27 (QA hardening + full project export)

### Added
- `agent.md` — agent/engineer operating guide (repo map, commands, red lines, pitfalls).
- `PRD.md` — living PRD with per-requirement implementation status (original brief preserved at
  `upload/PRD.md`).
- `TEST_BACKLOG.md` — pending test & backlog workstream with priorities.
- `QA_STATUS.md` — verified QA matrix (test/lint/typecheck/build + manual E2E evidence).
- `scripts/db-inspect.ts` — read-only database row-count inspector (`bun:sqlite`).
- `scripts/dump-db.ts` — portable SQL dump + per-table JSON exports for the SQLite database.
- `scripts/make-export.sh` + `README-EXPORT.md` — reproducible full project export (codebase,
  database dump, seeds, backups incl. git bundle, env files, guidance).
- `bunfig.toml` — scopes `bun test` discovery to `tests/` so generated export staging copies and
  sandbox scaffolding never pollute the suite.
- Full project export packaging: codebase ZIP + database dump + seeds + backups + env files +
  export guidance (`README-EXPORT.md`), delivered to `download/folioatlas-export-2026-10-27.zip`.

### Fixed
- `tsc --noEmit` now passes repo-wide (0 errors): added `/// <reference types="bun-types" />` to
  the seven unit-test files and excluded sandbox scaffolding (`examples/`, `mini-services/`,
  `skills/`) from the TypeScript project — it is not application code.
- `scripts/db-inspect.ts` rewritten to ESM imports (ESLint forbids `require()`).
- `.env.example`: corrected `DATABASE_URL` to `file:../db/custom.db` — Prisma resolves relative
  SQLite paths against `prisma/schema.prisma`, so the previous `./db/custom.db` would have
  pointed at `prisma/db/custom.db` (dormant in the sandbox, where `.env` uses an absolute path).
- Generated export staging (`export-staging/`) excluded from ESLint, `tsc` and `bun test`
  discovery (`.gitignore` + config), so packaging a release cannot break the QA gates.

### Verified (QA gates, all green on 2026-10-27)
- `bun test` — 74/74 pass (293 expect calls)
- `bun run lint` — 0 problems
- `bunx tsc --noEmit` — 0 errors
- `bun run build` — production build success, 13 routes

## [0.2.1] — 2026-10-26 (AI-enhanced upgrade — master brief phases 8–14)

### Added
- **Database layer:** Prisma schema rewritten 1:1 to the PRD data model (portfolios,
  portfolio_ai_summaries, portfolio_previews, sync_runs, portfolio_count_snapshots) with indexes,
  defaults, FKs and cascades.
- **Provenance-grade seeding:** `scripts/seed-db.ts` replays the upstream repository's real git
  history (3,715 README commits walked) → per-entry `first_seen_at` / `source_updated_at` from
  actual commits; 3,713 git-history snapshots with commit SHAs; idempotent upserts; `sync_runs`
  + snapshot recording. Verified history span: 2019-09-13 → 2026-10-26.
- **Store layer:** server-side keyword search (token AND), tech multi-select (AND), collection
  unions, letter/site/hasSummary/addedWithin filters, relevance scoring, detail + related,
  stats, growth bucketing (day/week/month), recently-added, featured (transparent criteria),
  related technologies (co-occurrence), letter counts.
- **API routes:** `/api/search`, `/api/stats` (60s cache), `/api/growth`, `/api/portfolios/[slug]`,
  `/api/technologies`, `/api/preview/[slug]` (302, server-side provider resolution, rate-limited),
  `/api/ai/search` (10/min), `/api/ai/summaries` (6/min).
- **AI layer:** Groq-compatible provider with JSON mode + built-in sandbox fallback and tolerant
  `extractJson`; zod-validated search intents restricted to the canonical vocabulary; grounded-only
  summaries persisted with model/status/source-hash and error tracking.
- **Client v2:** portfolio cards (preview images, AI badge, action row), preview dialog with
  iframe-timeout notice, portfolio detail pages (identity, attribution rules, AI summary card,
  related grid, JSON-LD), HomeView v2 (verified stats, Recharts growth chart with 30d/90d/1y/all
  + honest empty state, recently added, collections, featured), DirectoryView v2 (keyword/AI
  toggle, advanced filter popovers, chips, server-backed pagination), technology landing pages.
- **Command palette** (cmdk, API-driven, Enter opens top result, ⌘/Ctrl+Enter new tab) +
  keyboard shortcuts (`/`, ⌘K, Esc, ?, arrow navigation) with editable-target guard and help panel.
- **Supabase kit:** `supabase/migrations/0001_init.sql` (Postgres schema + GIN index + RLS:
  public read / service-role write) + setup & verification README — documented, not executed
  (no credentials available).
- `.env.example` fully annotated (DATABASE_URL, GROQ_*, PREVIEW_*, SCREENSHOT_ONE_*, SUPABASE_*,
  EMBEDDING_*).

### Fixed
- Radix `useId` hydration mismatch (DialogHeader inside portal content).
- cmdk native filtering conflicting with API results (`shouldFilter=false` + controlled value).
- React hooks lint (render-time adjustment patterns), letter query-param direct links, collection
  filtering.
- Portfolio payload removed from client bundle (API serves it) — smaller client JS.

### Verified
- 74/74 unit tests; lint clean; `tsc src/` clean (full-repo typecheck landed in 0.3.0).
- Browser E2E: home light/dark + stats, growth chart (real Feb 2026 upstream dip preserved, not
  smoothed), directory search URL-sync (62 results for "react"), filters, pagination, tech
  landing (Next.js: 30, related counts), collections, detail page with real preview + grounded AI
  summary, AI search with intent chips, palette + shortcuts, mobile 375px, console clean.

## [0.2.0] — 2026-10-26 (directory core — brief phases 1–7)

### Added
- Data pipeline: pure modules (types, url, parse, classify, identity, directory) +
  `scripts/sync-portfolios.ts` (retry/backoff fetch, branch resolution, atomic publish,
  50%-drop safety gate, `--check` mode).
- Generated artifacts from upstream commit `f1ace59`: 2,072 portfolios, 30 focus areas, 1,018
  classified; parser recovers real upstream anomalies with warnings and quarantines junk.
- Design system: Apple Liquid Glass tokens/materials with fallbacks, reduced-motion support,
  ambient backdrop, focus-visible rings.
- Hash-router SPA on `/` (sandbox exposes only root): shareable directory/search/filter URLs.
- Views: Home, Directory, Technologies index + landing, About/Methodology (30 documented
  classification rules), Privacy, 404.
- SEO: per-view titles, canonical, OG image from real stats, sitemap, robots, JSON-LD WebSite.
- CI (`.github/workflows/ci.yml`: lint + test + data validation + build) and daily upstream sync
  workflow (cron → auditable PR).

### Verified
- 50/50 unit tests (parse, URL validation, classification, identity, search/filter/sort/pagination).
- Browser E2E across desktop + 375px mobile with zero console errors.

## [0.1.0] — 2026-10-26 (project bootstrap)

- Next.js 16 + TypeScript strict + Tailwind 4 + shadcn/ui scaffold; fullstack environment
  initialized; upstream source format analysis (header count == list count == 2,072; edge cases
  catalogued; 0 credentials, 0 duplicate URLs, 8 duplicate names disambiguated by identity).
