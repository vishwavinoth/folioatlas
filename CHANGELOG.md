# Changelog

All notable changes to FolioAtlas are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is pragmatic
(semantic versioning from 1.0.0).

## [1.1.0] — 2026-11-11 (engagement, leaderboard, SEO)

### Added
- **Likes, views and site visits** for every portfolio — anonymous and deduplicated (one like per
  visitor; views/visits once per visitor per UTC day), bots ignored, per-network daily caps. Only
  salted hashes are stored; the IP hash rotates daily. Hidden unless `ENGAGEMENT_SALT` is set.
  Migration `supabase/migrations/0003_engagement.sql` (locked-down tables, aggregate-only public
  functions, service-role-only writes).
- **Leaderboard** (`/leaderboard`, Product Hunt style): daily / weekly / monthly / yearly / all time,
  ranked by likes or views, with date navigation and a day/month quick-jump strip; "Trending this
  week" on the home page; "On FolioAtlas" stats on portfolio pages.
- **Server-rendered content for SEO**: pages embed the exact API payloads their views request, so
  directory lists, profiles and the leaderboard are in the HTML for crawlers and AI assistants.
- JSON-LD `@graph` (WebSite + SearchAction, creator Person, CollectionPage + ItemList, ProfilePage,
  BreadcrumbList); sharper titles/descriptions with live counts; `noindex` for thin profiles.
- Per-portfolio social cards (`/og/portfolio/{slug}`, bundled DejaVu Sans with its license).
- Sitemap with every profile that has role text (real upstream `lastmod`), `robots.txt` welcoming
  named AI crawlers, `/llms.txt` + `/llms-full.txt`, web manifest + PNG icons, `humans.txt`,
  `.well-known/security.txt`, security headers, search-console verification env vars.
- "Developed by Vishwa R" credit with portfolio / GitHub (LinkedIn configurable) links.

### Fixed
- Letter pages (`/portfolios/letter/x`) listed the whole directory: the letter was never sent to
  the search API for the path form.
- Focus rings: the global `:focus-visible` style was unlayered, so it overrode every component's
  `outline-none` (the command palette input showed a clipped ring) and forced `border-radius: 4px`
  on focused pill buttons. It now lives in `@layer base`; search fields show a container ring.
- Hydration safety: all dates render in UTC and numbers in `en-US`, matching server output.
- AI controls appeared in production although AI requests failed (an invalid `GROQ_API_KEY`):
  AI features now render only after Groq accepts the key for the configured model (cached probe,
  10 min), and the reason is logged when it does not.
- Layout: navigation collapses into the menu below 1024px (it overflowed at 768px), the footer
  stacks below 1024px and wraps the repository name, compact pagination on small phones, card
  names wrap instead of truncating, leaderboard period tabs fit on phones.

## [1.0.0] — 2026-11-11 (public launch)

### Changed
- Out of beta: the Beta badge and footer note are removed (`RELEASE_STAGE = null`).
- Social preview image (`public/og.png`) redrawn: the count pill no longer overlaps the focus
  areas, and the daily sync regenerates it so shared links always show the current count.

## [0.5.2] — 2026-11-11 (automatic sync fixed)

### Fixed
- **Daily sync never succeeded.** The script read the upstream branch from `GITHUB_REF`, which
  GitHub Actions sets to this repository's own branch (`refs/heads/main`), so it requested a
  README that does not exist (404). Upstream overrides are now `UPSTREAM_OWNER`,
  `UPSTREAM_REPO`, `UPSTREAM_REF` and `UPSTREAM_README_PATH`.
- The public README is fetched without credentials: a token scoped to another repository made
  raw.githubusercontent.com answer 404 as well.

### Changed
- The daily sync is fully automatic: on a real change it runs the tests, updates Supabase and
  commits the refreshed artifact to `main` (no pull request to merge). Timestamp-only changes
  are ignored. `actions/checkout` updated to v5.

## [0.5.1] — 2026-10-26 (feedback + beta)

### Added
- Toast notifications (sonner) for user actions: profile link copied, copy failed (with a
  fallback hint), AI summary generated / failed (rate limit, missing data, service down) and AI
  search falling back to keyword results.
- "Beta" badge next to the logo and a beta note in the footer (`RELEASE_STAGE` in
  `src/lib/site/creator.ts`; set to `null` at launch).
- Creator credit with "Say hi on GitHub" and "Add your portfolio" calls to action.

### Fixed
- Dismissing the native share sheet no longer falls through to copying the link.

## [0.5.0] — 2026-10-26 (clean URLs, SEO, UI polish)

### Changed
- **Clean, server-rendered URLs** replace the hash-routed SPA (`/portfolios`, `/technologies/react`,
  `/portfolio/{slug}` …). Each route gets server-side title, description, canonical URL, Open Graph
  tags and JSON-LD; unknown routes return a real HTTP 404; old `/#/…` links redirect.
- Sitemap lists real paths only (non-empty letters, technologies with ≥5 entries, collections) and
  uses the actual sync time as `lastmod`; `robots.txt` blocks `/api/` and all non-production
  deployments; search/filter URLs are `noindex`.
- Portfolio cards are text-first: the oversized domain tile is gone and the action row
  (Details · Visit site · Copy link) fits every grid width.
- Detail page: compact Website card (with an HTTPS warning for `http://` sites) replaces the empty
  preview block; duplicate Preview/Copy buttons removed; "Visit website" is the primary action.
- Focus-area chips no longer show an external-link arrow (they link within the site).
- Privacy and Methodology pages describe the real production setup (Vercel, Supabase, GitHub
  avatars, local theme preference, no cookies).

### Fixed
- AI search, "Generate AI summary" and the "Has AI summary" filter are hidden when no AI provider
  is configured (PRD: no non-functional buttons).
- Client-side document titles and an unverifiable `ProfilePage/Person` JSON-LD were removed in
  favour of server metadata.

## [0.4.0] — 2026-10-26 (Supabase-only, production deployment)

### Changed
- **Supabase is the only database.** Prisma, SQLite (`prisma/`, `db/custom.db`) and all
  SQLite tooling were removed. The server uses `@supabase/supabase-js`: reads with the
  publishable key under RLS, AI-summary writes with the service-role key.
- Query logic moved into a pure, unit-tested module (`src/lib/store/catalog.ts`); the store
  loads the catalog from Supabase once per instance with a 5-minute cache.
- `scripts/seed-db.ts` now syncs Supabase (idempotent upserts, removes entries deleted
  upstream, marks failed runs `failed`).
- Standard Vercel build (`next build` / `next start`); dropped standalone output.
- Public API responses are CDN-cacheable (`s-maxage=300, stale-while-revalidate=600`).
- AI provider is Groq only; the sandbox-only `z-ai-web-dev-sdk` fallback was removed.

### Added
- `supabase/migrations/0002_api_grants.sql` — explicit Data API grants.
- `.github/workflows/sync-database.yml` — syncs Supabase when a data PR is merged.
- `GET /api` health check; missing Supabase config returns `503 database-not-configured`.
- `tests/unit/catalog.test.ts` (search/filter/sort/related/featured/intent semantics);
  growth tests now exercise the real implementation (89 tests total).

### Fixed
- Site filter `github` no longer silently overrides a collection filter.
- Out-of-range pages return the last page's items instead of an empty list.
- AI search ranks every match instead of an arbitrary 400-row subset.

### Removed
- All third-party screenshot services (WordPress mShots, ScreenshotOne), `/api/preview`,
  `PREVIEW_PROVIDER` / `SCREENSHOT_ONE_ACCESS_KEY` and the unused `portfolio_previews` table.
  Cards show a self-contained domain tile; the preview dialog embeds the site itself.
- 18 unused dependencies, sandbox export tooling (`make-export.sh`, `dump-db.ts`,
  `db-inspect.ts`, `README-EXPORT.md`) and the sandbox `worklog.md`.

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
