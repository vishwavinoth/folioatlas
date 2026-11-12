# FolioAtlas — The Open Developer Portfolio Directory

**One beautiful place to discover real developer portfolios.**

FolioAtlas is a polished, searchable, SEO-optimized public directory of developer portfolios
sourced from the open-source GitHub repository
[`emmabostian/developer-portfolios`](https://github.com/emmabostian/developer-portfolios),
presented with an Apple Liquid Glass-inspired interface — now with AI-powered search,
AI-generated portfolio summaries, verified growth analytics, website previews, a command
palette and full keyboard navigation.

- Data: ground-truth upstream README → validated, deduplicated, classified index (nothing fabricated)
- Persistence: Supabase (Postgres + Row Level Security) via `@supabase/supabase-js`
- Stack: Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · shadcn/ui · Recharts · next-themes
- Pipeline: `scripts/sync-portfolios.ts` → JSON artifacts; `scripts/seed-db.ts` → provenance-grade Supabase sync
- Tests: 89 unit tests (`bun test`)

## Quick start

Prerequisite: a Supabase project with `supabase/migrations/*.sql` applied
(see [`supabase/README.md`](supabase/README.md)).

```bash
bun install                 # install dependencies
cp .env.example .env.local  # fill in the Supabase URL + keys
bun run db:seed             # load the directory + verified history into Supabase
bun run dev                 # start dev server on :3000

bun run lint                # ESLint
bun run typecheck           # TypeScript
bun test                    # unit tests (parser, URLs, catalog queries, AI intents, growth)

bun run sync:data           # regenerate the directory artifact from upstream
bun run og                  # regenerate the social preview image from current stats
```

## Features

### Discovery
- **HomeView**: hero with verified platform stats, quick filters, curated collections (real union
  counts), recently added portfolios (from verifiable first-seen dates), featured developers
  (transparent deterministic criteria), alphabetical browsing.
- **Portfolio Growth chart** (Recharts): cumulative directory size over time with 30d/90d/1y/all
  ranges. Backed exclusively by verified snapshots — upstream git-history commits (with SHAs) and
  recorded sync runs. The chart labels its coverage window and shows an honest empty state when
  history is thinner than the selected range.
- **Portfolio detail pages** (`/portfolio/[slug]`): identity, "View GitHub Profile" (labeled when
  inferred from a github.io domain), website card with in-page preview dialog, AI summary (only
  when one exists or AI is configured), focus areas, related portfolios, source & verification
  panel, share action.

### Search
- **Keyword search**: server-side, debounced, URL-synced, relevance/name/newest sorting.
- **Advanced filters**: multi focus-area (AND), site type (own website vs GitHub-hosted), has-AI-summary,
  added-within window (verified first-seen dates), active filter chips, clear-all — every state shareable.
- **AI search** (toggle): natural-language queries are parsed into a typed, zod-validated intent
  restricted to the canonical technology vocabulary, then executed as a real database query. Each
  result explains why it matched. Falls back to keyword search when the AI provider is unavailable.
  The model can shape the query; it can never invent entries.
- **Command palette** (`⌘K`/`Ctrl+K`): live portfolio search + navigation commands.

### Keyboard shortcuts
| Shortcut | Action |
|---|---|
| `/` | Focus global search (never fires while typing in a field) |
| `Ctrl/Cmd + K` | Open command palette |
| `Esc` | Close the topmost dialog, palette or preview |
| `Enter` | Activate the selected palette result |
| `↑ ↓` | Navigate palette results |
| `Ctrl/Cmd + Enter` | Open the selected result in a new tab |
| `?` | Keyboard shortcuts help panel |

### Likes, views and the leaderboard
- **Likes** (one per anonymous visitor), **views** of portfolio pages and **site visits** (clicks
  through) are counted once per visitor per day; bots are ignored and per-network daily caps limit
  abuse. Only salted hashes are stored — a random visitor ID lives in localStorage (no cookies), and
  the IP hash rotates daily (`src/lib/engagement/server.ts`, `supabase/migrations/0003_engagement.sql`).
- **`/leaderboard`** (Product Hunt style): daily / weekly / monthly / yearly / all-time rankings by
  likes or views, with date navigation; the home page shows "Trending this week" once there are likes.
- Hidden entirely unless `ENGAGEMENT_SALT` and `SUPABASE_SECRET_KEY` are set (no dead buttons).

### SEO and AI discoverability
- Pages are server-rendered **with their data** (directory lists, profiles, leaderboard): the page
  embeds the exact API payloads its views request (`src/lib/store/payloads.ts`, `src/hooks/prefetch-context.tsx`),
  so crawlers that do not run JavaScript see real content.
- Per-route titles/descriptions, canonical URLs, Open Graph/Twitter cards, real 404s, `noindex` for
  query URLs and for thin profiles (no role text). JSON-LD `@graph`: `WebSite` + `SearchAction`, the
  creator `Person`, `CollectionPage` + `ItemList`, `ProfilePage`, `BreadcrumbList`.
- Per-portfolio social cards at `/og/portfolio/{slug}` (name, role, focus areas).
- `/sitemap.xml` (listing pages + every profile with role text, real `lastmod`), `/robots.txt`
  (search engines + named AI crawlers welcome, `/api/` blocked, previews disallowed), `/llms.txt` and
  `/llms-full.txt` (llmstxt.org), web manifest + icons, `humans.txt`, `.well-known/security.txt`,
  security headers (no framing, nosniff, referrer/permissions policies). Search console tokens via
  `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION`.

### Website previews
No screenshot or thumbnail service is used. Cards stay text-first (name, domain, role, focus areas); the
in-page preview dialog embeds the portfolio site itself on demand. Sites that block embedding via
security headers get a graceful notice with an always-available open-in-new-tab action.

## How the data pipeline works

```
Upstream GitHub repository (README.md, branch resolved automatically)
        │  fetch with retries/backoff (optional GITHUB_TOKEN)
        ▼
Parse ── deterministic parser for the real upstream format
        │   "- [Name](url) [Role]" (+ documented recoveries, quarantine for junk)
        ▼
Validate + Normalize URLs ── http/https only; rejects credentials,
        │   private/loopback hosts, dangerous schemes; conservative normalization
        ▼
Deduplicate ── identity = fully normalized URL; collisions reported, never silently dropped
        ▼
Classify (optional labels) ── keyword rules applied ONLY to upstream role text
        ▼
Atomic publish ── tmp file → validate → rename (a failed sync never erases good data)
        ▼
src/data/portfolios.generated.json + src/data/sync-report.generated.json
```

### Provenance-grade database sync (`scripts/seed-db.ts`)

Loads the reviewed artifact into Supabase (service-role key) and adds verifiable history that a
single report cannot provide. Idempotent; entries removed upstream are deleted.

- Replays the upstream repository's **actual git history** (~3,700 README commits).
- `first_seen_at` = the first commit containing the entry (valid, normalized URL).
- `source_updated_at` = the last commit where the entry's content hash changed.
- `portfolio_count_snapshots` rows carry `provenance: git-history` + the exact commit SHA,
  alongside `sync-run` snapshots recorded on every successful sync.
- Growth math: "added in period" is summed per bucket (an entry is new exactly once), the
  cumulative total is the later snapshot in each bucket. No interpolation, no fabrication —
  real upstream dips (e.g. a temporarily truncated README) stay visible.

## Data model

Defined in `supabase/migrations/` (typed in `src/lib/supabase/types.ts`):

| Table | Purpose |
|---|---|
| `portfolios` | Directory entries with provenance (section, line, entry hash, first/last seen) |
| `portfolio_ai_summaries` | Zod-validated AI summaries with model, status, source hash, errors |
| `sync_runs` | One row per synchronization execution with counts and commit SHA |
| `portfolio_count_snapshots` | Growth-chart series with per-row provenance |
| `portfolio_reactions` | Likes: one row per (portfolio, hashed visitor) |
| `portfolio_events` | Views and site visits: one row per (portfolio, kind, hashed visitor, UTC day) |

RLS: public read, service-role-only writes. The engagement tables are not readable at all through
the Data API; only aggregate functions (`engagement_counts`, `engagement_leaderboard`) are public,
and writes go through service-role-only functions. The server reads with the publishable key and loads
the (small) catalog once per instance with a 5-minute cache (`src/lib/store/queries.ts`); all
search/filter/ranking logic is pure and unit-tested (`src/lib/store/catalog.ts`).

## Environment variables

Copy `.env.example` to `.env.local` (never commit it):

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **yes** | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **yes** | Publishable/anon key (read-only under RLS) |
| `SUPABASE_SECRET_KEY` | for AI summaries + seeding | **Server-only**, bypasses RLS — never expose to the browser |
| `NEXT_PUBLIC_SITE_URL` | production | Canonical origin used for metadata, sitemap, JSON-LD |
| `GITHUB_TOKEN` | no | Optional read-only token if raw.githubusercontent rate limits you |
| `UPSTREAM_OWNER/REPO/REF/README_PATH` | no | Upstream source overrides (not `GITHUB_*`, which Actions reserves) |
| `GROQ_API_KEY` | no | Enables Groq for AI search intents + summaries (server-only) |
| `GROQ_MODEL` | no | Primary Groq model (default `openai/gpt-oss-120b`) |
| `GROQ_FALLBACK_MODEL` | no | Tried once on rate limit/outage (default `openai/gpt-oss-20b`; `off` disables) |
| `ENGAGEMENT_SALT` | for likes/views | Random 32+ char secret for anonymous hashing; never change once live |
| `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` | no | Search console ownership tokens |

The Vercel ↔ Supabase integration's variable names (`NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_URL`) are accepted as fallbacks. Server-only secrets must never be prefixed with
`NEXT_PUBLIC_`. AI features degrade gracefully: without `GROQ_API_KEY` the AI endpoints return 503
and the UI falls back to keyword search.

## Routes (API)

| Route | Purpose |
|---|---|
| `GET /api` | Health check (Supabase connectivity + row count) |
| `GET /api/search` | Keyword search, filters, sort, pagination (validated params) |
| `GET /api/stats` | Verified platform stats + discovery payloads (CDN-cached) |
| `GET /api/growth?range=` | Verified growth series (30d/90d/1y/all) |
| `GET /api/portfolios/[slug]` | Detail payload + related portfolios |
| `GET /api/technologies[?slug=]` | Canonical technology list / landing metadata + related techs |
| `POST /api/ai/search` | Natural-language search (rate-limited, validated intent, real query) |
| `POST /api/ai/summaries` | Generate/refresh one summary (rate-limited, persisted, reused) |
| `GET /api/engagement?slugs=` | All-time likes/views/visits for up to 100 portfolios (no cache) |
| `POST /api/engagement` | Record a view or site visit (`{slug, kind, vid}`; always 204) |
| `POST /api/reactions` | Like/unlike (`{slug, vid, liked}` → `{liked, likes}`; 429 at the daily cap) |
| `GET /api/leaderboard?period=&date=&metric=` | Ranked portfolios for a UTC day/week/month/year/all time |
| `GET /og/portfolio/[slug]` | 1200×630 social card for a portfolio page |

## Routes (app)

Clean, server-rendered URLs. Every route gets its own title, description, canonical URL, Open
Graph tags and JSON-LD from `src/app/[[...slug]]/page.tsx`; unknown paths, letters, technologies,
collections and portfolio slugs return a real **404**. Search/filter URLs (`?q=…`) are shareable
but `noindex`. Old `/#/…` links redirect to their clean equivalents.

| Route | Purpose |
|---|---|
| `/` | Home: hero, stats, growth chart, recent, collections, featured |
| `/portfolios` | Directory with search/filters/sort/pagination |
| `/portfolios/letter/{a–z}` | Alphabetical browsing |
| `/portfolio/{slug}` | Shareable developer profile page |
| `/technologies`, `/technologies/{slug}` | Focus-area index and landing pages |
| `/collections/{slug}` | Curated collection (union of focus areas) |
| `/leaderboard` | Most liked / viewed portfolios by period |
| `/about`, `/methodology`, `/privacy` | Content pages |
| `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/manifest.webmanifest` | Crawler + app metadata |

## Deployment (Vercel)

1. Supabase: apply `supabase/migrations/*.sql`, then run `bun run db:seed` once (or the
   "Sync database" workflow) — see `supabase/README.md`.
2. Vercel → Settings → Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`
   (+ optional `GROQ_API_KEY`). Redeploy after changing them.
3. Build and start use the framework defaults (`next build` / `next start`); no extra config.
4. Smoke-test: `/api` → `{"status":"ok","portfolios":2072}`, `/api/stats` 200, `/sitemap.xml`
   valid XML, one `/portfolio/[slug]` page, no console errors. A `503 database-not-configured`
   response means the Supabase variables are missing.

### Scheduled data synchronization

`.github/workflows/sync-portfolios.yml` runs daily at 06:00 UTC (and on manual dispatch), fully
automatically:

1. Fetch the upstream README → parse → validate → generate artifacts
2. Compare the portfolio list and upstream commit with `main` (timestamp-only changes are ignored)
3. If it changed: unit tests → update Supabase (`scripts/seed-db.ts`, recording a `sync_runs` row +
   snapshot) → commit the refreshed artifact to `main`, which Vercel redeploys
4. Any failure stops the run before anything is published; the previous data keeps serving

Requires the repository secrets `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Every data change is
an auditable `chore(data): …` commit. `.github/workflows/sync-database.yml` re-syncs Supabase on
manual dispatch or when a person pushes an artifact change (e.g. a revert).

`ci.yml` runs lint, typecheck, unit tests, and the production build on every push/PR.

### Rollback

Data rollbacks are Git operations — revert the `chore(data)` commit (or check out the previous artifact) and
re-run the "Sync database" workflow. The sync pipeline never mutates data in place: artifacts are replaced atomically only
after validation, and failed syncs never erase good data.

## Verification checklist (implemented)

- [x] Every valid upstream entry represented (2,072/2,072; 1 anomaly recovered with warnings)
- [x] Invalid URLs quarantined + reported in `sync-report.generated.json`
- [x] Growth history from verified commits + sync snapshots (provenance labeled per point)
- [x] Keyword search, AI search, advanced filters, sorting, pagination — all URL-shareable
- [x] AI summaries schema-validated, stored, reused, labeled; graceful fallbacks everywhere
- [x] Keyboard shortcuts that never hijack typing; shortcuts help panel
- [x] Loading/empty/error/not-found states; reduced-motion and backdrop-filter fallbacks
- [x] Light/dark themes, system preference, no flash of wrong theme
- [x] External links `rel="noopener noreferrer"`; no tokens or env in client bundles
- [x] Unique titles/descriptions, canonicals, OG image, JSON-LD (`WebSite` + `ProfilePage`), sitemap, robots

## License & attribution

Directory data by the [`emmabostian/developer-portfolios`](https://github.com/emmabostian/developer-portfolios)
community (see that repository for its license). FolioAtlas is an independent interface for
that data and is not affiliated with or endorsed by Apple or the upstream maintainers.
