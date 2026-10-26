# agent.md — FolioAtlas Agent Guide

Operating guide for any AI coding agent (or new engineer) working in this repository.
Read this before changing code. Last verified 2026-10-27 against the current tree.

---

## 1. What this repo is

FolioAtlas — a production-grade directory of 2,072 real developer portfolios sourced from
[`emmabostian/developer-portfolios`](https://github.com/emmabostian/developer-portfolios),
with AI search, AI summaries, verified growth analytics, previews, and a command palette.

- **Stack:** Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · shadcn/ui ·
  Supabase (Postgres + RLS, `@supabase/supabase-js`) · Recharts · next-themes · cmdk · zod · Bun
- **Persistence:** Supabase only. Schema in `supabase/migrations/`; the server reads with the
  publishable key and caches the catalog per instance; writes use the service-role key.
- **Hosting:** Vercel (framework defaults; no standalone output).
- **Sandbox constraint:** the host exposes only the root `/` route, so the app is a hash-routed
  SPA on `/` (`src/lib/router/hash-router.ts`). Do not "fix" this into path routes without also
  removing that constraint — production instructions are in README.

## 2. Repository map

```
src/app/                  Next.js App Router: layout, page (SPA mount), API routes, sitemap, robots
src/app/api/              search, stats, growth, portfolios/[slug], technologies,
                          preview/[slug], ai/search, ai/summaries
src/components/           views/ (home, directory, technologies, content), directory/, search/,
                          portfolio/, preview/, command/ (palette), navigation/, analytics/, ui/
src/lib/portfolio/        pure data pipeline: parse, url, classify, identity, directory, github
src/lib/store/catalog.ts  PURE query logic: search/filter/sort/pagination, related, growth bucketing
src/lib/store/queries.ts  Supabase loader + 5-min per-instance cache feeding catalog.ts
src/lib/supabase/         server.ts (reader/writer clients, paging), types.ts (table types)
src/lib/ai/               provider.ts (Groq + extractJson), search-intent.ts (zod),
                          summaries.ts (grounded generation + persistence)
src/lib/server/           request (validation, serverError, cache headers), rate-limit, preview
src/lib/router/           hash-router (SPA navigation, URL state)
src/data/                 GENERATED artifacts — never hand-edit:
                          portfolios.generated.json (2,072 entries), sync-report.generated.json
scripts/                  sync-portfolios.ts (upstream → artifact), seed-db.ts (artifact → Supabase),
                          generate-og.ts
supabase/                 migrations/ (schema, RLS, API grants) + README (setup + RLS checks)
tests/unit/               8 files / 89 tests (bun test)
.github/workflows/        ci.yml (lint+typecheck+test+build), sync-portfolios.yml (daily upstream
                          sync → PR), sync-database.yml (merged artifact → Supabase)
```

## 3. Commands

```bash
bun install                 # deps
bun run dev                 # dev server :3000 (needs Supabase vars in .env.local)
bun run build               # production build (must pass before any handoff)
bun run lint                # ESLint — must stay at 0 problems
bun run typecheck           # tsc --noEmit — must stay at 0 errors
bun test                    # unit tests — must all pass
bun run sync:data           # regenerate data artifacts from upstream (has --check mode)
bun run db:seed             # sync Supabase from artifact + real upstream git history
bun run og                  # regenerate public/og.png from current stats
```

**QA gates are merge-blocking:** `bun run lint`, `bun run typecheck`, `bun test`,
`bun run build`. All four must be green before you claim any task done.

## 4. Non-negotiable data-honesty rules

These are product red lines from the PRD. Violating any of them is a failed task, even if the
build is green.

1. **Never fabricate data.** No invented portfolios, no synthetic growth history, no hardcoded AI
   replies, no placeholder screenshots, no dead buttons. The growth chart renders only rows from
   `portfolio_count_snapshots` (provenance `git-history` with SHA, or `sync-run`).
2. **Never treat the sync-report timestamp as creation dates.** `first_seen_at` comes from real
   upstream git commits replayed by `scripts/seed-db.ts`.
3. **Attribution discipline.** Claim authorship/ownership only when the source supports it. GitHub
   identities derived from github.io domains must stay labeled `inferred` (`githubSource`).
4. **AI can shape queries, never invent rows.** AI search output is zod-validated against the
   canonical vocabulary; unknown slugs are dropped; the DB query produces the results.
5. **Secrets are server-only.** Groq/ScreenshotOne/Supabase-service keys must never appear in
   client bundles or be prefixed `NEXT_PUBLIC_`. Preview URLs resolve server-side and redirect.
6. **A failed sync never deletes data.** Artifacts publish atomically (tmp → validate → rename);
   upstream failures keep previous artifacts; 50%-drop safety gate refuses corrupted publishes.
7. **AI outputs are labeled** as AI-generated, with graceful fallback text when unavailable.

## 5. Known pitfalls (learned the hard way — do not re-learn them)

- **Supabase columns are snake_case** (`portfolio_url`); the wire format is camelCase
  (`portfolioUrl`). Map in `buildCatalog`, never leak rows to clients.
- **PostgREST caps responses (default 1000 rows).** Use `fetchAllRows` with a stable `order`.
- **Catalog cache is per instance (5 min).** Call `invalidateCatalog()` after server writes;
  other instances converge on their next refresh.
- **`bun:test` types:** test files start with `/// <reference types="bun-types" />`. Keep that
  line when creating new tests, or `tsc --noEmit` breaks.
- **ESLint forbids `require()`** (`@typescript-eslint/no-require-imports`) — use ESM imports even
  in one-off scripts under `scripts/`.
- **Hydration safety:** theme uses `useSyncExternalStore`; Radix `useId` mismatches are avoided by
  keeping `DialogHeader` inside portal content; the router initializes with `"#/"` then aligns in
  `queueMicrotask`. Follow these patterns; don't introduce render-time DOM writes that differ
  server/client.
- **cmdk:** the palette sets `shouldFilter={false}` and controls the selected value — results come
  from the API, Enter opens the controlled top result. Don't re-enable native filtering.
- **React hooks lint (`react-hooks/set-state-in-effect`):** prefer render-time adjustment or
  `useSyncExternalStore` over `setState` in effects.
- **Next 16 + Tailwind 4:** config is `tailwind.config.ts` + CSS-first tokens in `globals.css`;
  glass materials live there — extend tokens rather than hardcoding colors in components.
- **Search params live in the hash** (`#/portfolios?q=...`). Use the hash-router helpers; transient
  query updates use replace, view changes use push.
- **`.env*` is git-ignored and must stay that way.**

## 6. Environment variables

`.env.example` is the canonical annotated list.

- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; plus
  `SUPABASE_SERVICE_ROLE_KEY` for AI summaries and seeding. Missing config → `503
  database-not-configured` (see `serverError`).
- AI features require `GROQ_API_KEY`; without it AI endpoints return 503 and the UI falls back.
- Previews use the public no-credential provider; `SCREENSHOT_ONE_ACCESS_KEY` upgrades it;
  `PREVIEW_PROVIDER=none` disables it.

## 7. Working norms

- Prefer pure modules under `src/lib/portfolio/` (unit-testable) and thin route/view shells.
- Any change to data shape or pipeline must update: a new `supabase/migrations/` file,
  `src/lib/supabase/types.ts`, `sync-portfolios.ts`/`seed-db.ts`, unit tests, and the docs
  (`README.md`, `PRD.md`, `CHANGELOG.md`, `QA_STATUS.md`).
- New tests go in `tests/unit/*.test.ts` with the bun-types reference line; keep them hermetic
  (no network). Fixture generation pattern: see `tests/unit/parse.test.ts` (`import.meta.dir`).
- Browser verification: after UI changes, verify the affected flows with a real browser (desktop
  + 375px mobile), including console cleanliness, before claiming done.
- Commits: descriptive messages; keep `main` green so any commit is releasable.
