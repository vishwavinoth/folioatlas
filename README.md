# FolioAtlas — The Open Developer Portfolio Directory

**One beautiful place to discover real developer portfolios.**

FolioAtlas is a polished, searchable, SEO-optimized public directory of developer portfolios
sourced from the open-source GitHub repository
[`emmabostian/developer-portfolios`](https://github.com/emmabostian/developer-portfolios),
presented with an Apple Liquid Glass-inspired interface.

- Data: ground-truth upstream README → validated, deduplicated, classified index (nothing fabricated)
- Stack: Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · shadcn/ui · next-themes
- Pipeline: `scripts/sync-portfolios.ts` → `src/data/portfolios.generated.json` (+ validation report)
- Tests: 50+ unit tests (`bun test tests/unit`)

## Quick start

```bash
bun install           # install dependencies
bun run dev           # start dev server on :3000
bun run lint          # ESLint
bun test tests/unit   # unit tests (parser, URLs, classification, directory logic)

# regenerate the directory data from the upstream repository
bun scripts/sync-portfolios.ts
bun scripts/generate-og.ts   # regenerate the social preview image from current stats
```

## How the data pipeline works

```
Upstream GitHub repository (README.md, branch resolved automatically)
        │  fetch with retries/backoff (optional GITHUB_TOKEN)
        ▼
Parse  ── deterministic parser for the real upstream format
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

Safety gates: the pipeline refuses to publish an empty index or one that lost >50% of entries
(that signals an upstream format change needing parser review). Every artifact records the
source branch, commit SHA, and generation timestamp; the site footer shows the exact commit.

## Environment variables

Copy `.env.example` to `.env` (never commit `.env`):

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | production | Canonical origin used for metadata, sitemap, JSON-LD |
| `GITHUB_TOKEN` | no | Optional read-only token if raw.githubusercontent rate limits you |
| `GITHUB_OWNER` | no | Defaults to `emmabostian` |
| `GITHUB_REPO` | no | Defaults to `developer-portfolios` |
| `GITHUB_REF` | no | Defaults to the repository's default branch (falls back to `master`) |
| `GITHUB_README_PATH` | no | Defaults to `README.md` |

Server-only secrets must never be prefixed with `NEXT_PUBLIC_`. The token is used for
read-only upstream fetches only; it is never shipped to the browser or logged.

## Routes

The production deployment exposes the canonical routes:

| Route | Purpose |
|---|---|
| `/` | Homepage: hero, search, deterministic preview, focus areas, source transparency |
| `/portfolios` | Searchable directory (query params: `q`, `tech`, `sort`, `page`) |
| `/portfolios/letter/{a–z}` | Alphabetical browsing |
| `/technologies` | Focus-area index |
| `/technologies/{slug}` | Filtered directory per verified category |
| `/about`, `/methodology`, `/privacy` | Content pages |
| `/sitemap.xml`, `/robots.txt` | Technical SEO (metadata routes) |

> **Note on this sandbox build:** the preview environment serves the root route only, so the
> full information architecture is implemented as a hash-routed SPA on `/` (e.g. `/#/portfolios?q=react`).
> The same components render under real paths when deployed normally; `sitemap.ts` and
> `robots.ts` already emit the canonical URLs above.

## Deployment (Vercel or any Node host)

1. Set `NEXT_PUBLIC_SITE_URL` to the production origin.
2. Build: `next build` (data artifact is committed; build does not require network).
3. Start: `next start` (or the platform's adapter).
4. Smoke-test after deploy: `/` 200, `/sitemap.xml` valid XML, `/robots.txt` points at sitemap,
   one representative technology route, no console errors.

### Scheduled data synchronization

`.github/workflows/sync-portfolios.yml` runs daily (and on manual dispatch):

1. Fetch upstream README → parse → validate → generate artifacts
2. If the index changed: run unit tests → open a PR with the diff (auditable)
3. If upstream fetch/parsing fails: keep the previous artifact, fail the job visibly

`ci.yml` runs lint, unit tests, and the production build on every push/PR.

### Rollback

Data rollbacks are Git operations — revert the data PR or checkout the previous
`src/data/portfolios.generated.json` and redeploy. The sync pipeline never mutates data
in place: artifacts are replaced atomically only after validation.

## Verification checklist (implemented)

- [x] Every valid upstream entry represented (2,072/2,072 at last sync; 1 anomaly recovered with warnings)
- [x] Invalid URLs quarantined + reported in `sync-report.generated.json`
- [x] Explicit duplicate policy (normalized-URL identity, collisions reported)
- [x] Search, letter filter, focus-area filter, sorting, pagination — all URL-shareable
- [x] Loading/empty/error/not-found states; reduced-motion and backdrop-filter fallbacks
- [x] Light/dark themes, system preference, no flash of wrong theme
- [x] Keyboard navigable; visible focus; accessible names; semantic landmarks
- [x] External links `rel="noopener noreferrer"`; no tokens or env in client bundles
- [x] Unique titles/descriptions, canonicals, OG image, JSON-LD `WebSite`, sitemap, robots

## License & attribution

Directory data by the [`emmabostian/developer-portfolios`](https://github.com/emmabostian/developer-portfolios)
community (see that repository for its license). FolioAtlas is an independent interface for
that data and is not affiliated with or endorsed by Apple or the upstream maintainers.
