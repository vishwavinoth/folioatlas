# FolioAtlas — The Open Developer Portfolio Directory

**One beautiful place to discover real developer portfolios.**

FolioAtlas is a polished, searchable, SEO-optimized public directory of developer portfolios
sourced from the open-source GitHub repository
[`emmabostian/developer-portfolios`](https://github.com/emmabostian/developer-portfolios),
presented with an Apple Liquid Glass-inspired interface — now with AI-powered search,
AI-generated portfolio summaries, verified growth analytics, website previews, a command
palette and full keyboard navigation.

- Data: ground-truth upstream README → validated, deduplicated, classified index (nothing fabricated)
- Persistence: Prisma/SQLite locally; 1:1 Supabase/Postgres migration kit in `supabase/`
- Stack: Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · shadcn/ui · Recharts · next-themes
- Pipeline: `scripts/sync-portfolios.ts` → JSON artifacts; `scripts/seed-db.ts` → provenance-grade database
- Tests: 74 unit tests (`bun test`)

## Quick start

```bash
bun install           # install dependencies
bun run db:push       # create/update the local SQLite database
bun run dev           # start dev server on :3000
bun run lint          # ESLint
bun test              # unit tests (parser, URLs, classification, AI intents, growth math, previews)

# regenerate the directory data from the upstream repository
bun scripts/sync-portfolios.ts
# (re)build the database from the artifact + verified upstream git history
bun scripts/seed-db.ts
bun scripts/generate-og.ts   # regenerate the social preview image from current stats
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
- **Portfolio detail pages** (`#/portfolio/[slug]`): identity, "View GitHub Profile" (labeled when
  inferred from a github.io domain), website preview with in-page dialog, AI summary, focus areas,
  related portfolios, source & verification panel, share/copy actions, JSON-LD.

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

### Website previews
Screenshot URLs are resolved **server-side** and redirected through `/api/preview/[slug]`, so
provider credentials never reach the browser. The default provider needs no credentials; a
ScreenshotOne key is used when configured; `PREVIEW_PROVIDER=none` disables previews entirely
(explicit "unavailable" state — never a fabricated screenshot). Sites that block embedding via
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

### Provenance-grade database seeding (`scripts/seed-db.ts`)

The database layer adds verifiable history that a single report cannot provide:

- Replays the upstream repository's **actual git history** (~3,700 README commits).
- `first_seen_at` = the first commit containing the entry (valid, normalized URL).
- `source_updated_at` = the last commit where the entry's content hash changed.
- `portfolio_count_snapshots` rows carry `provenance: git-history` + the exact commit SHA,
  alongside `sync-run` snapshots recorded on every successful sync.
- Growth math: "added in period" is summed per bucket (an entry is new exactly once), the
  cumulative total is the later snapshot in each bucket. No interpolation, no fabrication —
  real upstream dips (e.g. a temporarily truncated README) stay visible.

## Data model

`prisma/schema.prisma` (SQLite, active) mirrors `supabase/migrations/0001_init.sql` (Postgres) 1:1:

| Table | Purpose |
|---|---|
| `portfolios` | Directory entries with provenance (section, line, entry hash, first/last seen) |
| `portfolio_ai_summaries` | Zod-validated AI summaries with model, status, source hash, errors |
| `portfolio_previews` | Preview provider + status bookkeeping (URLs resolved server-side only) |
| `sync_runs` | One row per synchronization execution with counts and commit SHA |
| `portfolio_count_snapshots` | Growth-chart series with per-row provenance |

See `supabase/README.md` for the optional production Supabase setup (RLS: public read,
service-role-only writes).

## Environment variables

Copy `.env.example` to `.env` (never commit `.env`):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes (core) | SQLite URL; local file works out of the box |
| `NEXT_PUBLIC_SITE_URL` | production | Canonical origin used for metadata, sitemap, JSON-LD |
| `GITHUB_TOKEN` | no | Optional read-only token if raw.githubusercontent rate limits you |
| `GITHUB_OWNER/REPO/REF/README_PATH` | no | Upstream source overrides |
| `GROQ_API_KEY` | no | Enables Groq for AI search intents + summaries (server-only) |
| `GROQ_MODEL` | no | Any Groq JSON-mode model (default `llama-3.3-70b-versatile`) |
| `PREVIEW_PROVIDER` | no | `none` disables previews; default public provider needs no key |
| `SCREENSHOT_ONE_ACCESS_KEY` | no | Trusted screenshot provider key (server-only) |
| `NEXT_PUBLIC_SUPABASE_URL` / `_PUBLISHABLE_KEY` | no | Supabase browser-safe config (optional) |
| `SUPABASE_SERVICE_ROLE_KEY` | no | **Server-only**, bypasses RLS — never expose to the browser |
| `EMBEDDING_*` | no | Only if pgvector semantic search is wired up |

Server-only secrets must never be prefixed with `NEXT_PUBLIC_`. AI features degrade gracefully:
without any provider, the app falls back to keyword search and hides generation actions.

## Routes (API)

| Route | Purpose |
|---|---|
| `GET /api/search` | Keyword search, filters, sort, pagination (validated params) |
| `GET /api/stats` | Verified platform stats + discovery payloads (60s cache) |
| `GET /api/growth?range=` | Verified growth series (30d/90d/1y/all) |
| `GET /api/portfolios/[slug]` | Detail payload + related portfolios |
| `GET /api/technologies[?slug=]` | Canonical technology list / landing metadata + related techs |
| `GET /api/preview/[slug]` | 302 to the provider-resolved preview image (server-side) |
| `POST /api/ai/search` | Natural-language search (rate-limited, validated intent, real query) |
| `POST /api/ai/summaries` | Generate/refresh one summary (rate-limited, persisted, reused) |

## Routes (app)

The production deployment exposes the canonical routes; this sandbox serves the root route only,
so the information architecture is a hash-routed SPA on `/` (e.g. `/#/portfolios?q=react`):

| Hash route | Purpose |
|---|---|
| `#/` | Home: hero, stats, growth chart, recent, collections, featured |
| `#/portfolios` | Directory with search/filters/sort/pagination |
| `#/portfolios/letter/{a–z}` | Alphabetical browsing |
| `#/portfolio/{slug}` | Shareable developer profile page |
| `#/technologies`, `#/technologies/{slug}` | Focus-area index and landing pages |
| `#/collections/{slug}` | Curated collection (union of focus areas) |
| `#/about`, `#/methodology`, `#/privacy` | Content pages (incl. AI + provenance documentation) |

## Deployment (Vercel or any Node host)

1. Set `NEXT_PUBLIC_SITE_URL` (and optional AI/preview/Supabase vars).
2. Build: `next build`.
3. Start: `next start` (or the platform's adapter).
4. Smoke-test after deploy: `/` 200, `/api/stats` 200, `/sitemap.xml` valid XML, `/robots.txt`
   points at sitemap, one representative `#/portfolio/[slug]` page, no console errors.

### Scheduled data synchronization

`.github/workflows/sync-portfolios.yml` runs daily (and on manual dispatch):

1. Fetch upstream README → parse → validate → generate artifacts
2. If the index changed: run unit tests → open a PR with the diff (auditable)
3. If upstream fetch/parsing fails: keep the previous artifact, fail the job visibly

Extend the workflow with `bun scripts/seed-db.ts` (or a Supabase-aware variant) to record each
successful sync as a `sync_runs` row + snapshot, growing the verified chart history automatically.

`ci.yml` runs lint, unit tests, and the production build on every push/PR.

### Rollback

Data rollbacks are Git operations — revert the data PR or checkout the previous artifact and
redeploy. The sync pipeline never mutates data in place: artifacts are replaced atomically only
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
