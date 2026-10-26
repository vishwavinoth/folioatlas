# agent.md — FolioAtlas Agent Guide

Operating guide for any AI coding agent (or new engineer) working in this repository.
Read this before changing code. Last verified 2026-10-27 against the current tree.

---

## 1. What this repo is

FolioAtlas — a production-grade directory of 2,072 real developer portfolios sourced from
[`emmabostian/developer-portfolios`](https://github.com/emmabostian/developer-portfolios),
with AI search, AI summaries, verified growth analytics, previews, and a command palette.

- **Stack:** Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · shadcn/ui ·
  Prisma + SQLite (active persistence) · Recharts · next-themes · cmdk · zod · Bun runtime
- **Persistence:** local Prisma/SQLite is the working layer. A 1:1 Postgres/Supabase kit lives in
  `supabase/` (documented, **not yet executed** — needs credentials).
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
src/lib/store/queries.ts  server-side store: search/filter/sort/pagination, stats, growth bucketing
src/lib/ai/               provider.ts (Groq/fallback + extractJson), search-intent.ts (zod),
                          summaries.ts (grounded generation + persistence)
src/lib/server/           request, rate-limit, preview (provider resolution), hash
src/lib/router/           hash-router (SPA navigation, URL state)
src/data/                 GENERATED artifacts — never hand-edit:
                          portfolios.generated.json (2,072 entries), sync-report.generated.json
scripts/                  sync-portfolios.ts, seed-db.ts, generate-og.ts, db-inspect.ts, dump-db.ts
prisma/schema.prisma      5 models: Portfolio, PortfolioAiSummary, PortfolioPreview, SyncRun,
                          PortfolioCountSnapshot (SQLite tables use PascalCase model names!)
supabase/                 optional production kit: migrations/0001_init.sql + README (unverified)
tests/unit/               7 files / 74 tests (bun test)
.github/workflows/        ci.yml (lint+test+build), sync-portfolios.yml (daily upstream sync → PR)
db/custom.db              the live SQLite database
```

## 3. Commands

```bash
bun install                 # deps
bun run db:push             # create/update SQLite schema from prisma/schema.prisma
bun run dev                 # dev server :3000 (logs to dev.log)
bun run build               # production build (must pass before any handoff)
bun run lint                # ESLint — must stay at 0 problems
bunx tsc --noEmit           # typecheck — must stay at 0 errors
bun test                    # 74 unit tests — must stay 74/74
bun scripts/sync-portfolios.ts   # regenerate data artifacts from upstream (has --check mode)
bun scripts/seed-db.ts           # (re)build DB from artifacts + real upstream git history
bun scripts/generate-og.ts       # regenerate public/og.png from current stats
bun scripts/db-inspect.ts        # read-only DB row counts (bun:sqlite, safe)
bun scripts/dump-db.ts           # SQL dump + per-table JSON exports (see script header)
```

**QA gates are merge-blocking:** `bun run lint`, `bunx tsc --noEmit`, `bun test`,
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

- **Prisma SQLite tables are PascalCase** (`Portfolio`, not `portfolios`). Raw SQL via
  `bun:sqlite` must query `"Portfolio"` etc. See `scripts/db-inspect.ts`.
- **`bun:test` types:** test files start with `/// <reference types="bun-types" />`. Keep that
  line when creating new tests, or `tsc --noEmit` breaks.
- **tsconfig excludes** `examples/`, `mini-services/`, `skills/` (sandbox scaffolding, not app
  code). Don't remove them from exclude; don't import from them.
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
- **`.env` is git-ignored and must stay that way** — except that an explicit user export may
  package it (see `.env` content below; it contains no secrets in this sandbox).

## 6. Environment variables

`.env.example` is the canonical annotated list. Current reality in this sandbox:

- `.env` contains exactly one line: `DATABASE_URL=file:/home/z/my-project/db/custom.db`.
- AI features work here via the built-in provider fallback (`z-ai-web-dev-sdk`); setting
  `GROQ_API_KEY` switches to Groq automatically (server-side only).
- Previews use the public no-credential provider; `SCREENSHOT_ONE_ACCESS_KEY` upgrades it;
  `PREVIEW_PROVIDER=none` disables it.
- Supabase vars exist but are intentionally unset — see `supabase/README.md` for the 6-step setup
  and verification SQL when credentials become available.

## 7. Working norms

- Read `worklog.md` first — it is the append-only multi-agent record; append your Task ID entry
  when done. Never overwrite others' entries.
- Prefer pure modules under `src/lib/portfolio/` (unit-testable) and thin route/view shells.
- Any change to data shape or pipeline must update: `prisma/schema.prisma`,
  `supabase/migrations/` (keep 1:1), `sync-portfolios.ts`/`seed-db.ts`, unit tests, and the docs
  (`README.md`, `PRD.md`, `CHANGELOG.md`, `QA_STATUS.md`).
- New tests go in `tests/unit/*.test.ts` with the bun-types reference line; keep them hermetic
  (no network). Fixture generation pattern: see `tests/unit/parse.test.ts` (`import.meta.dir`).
- Browser verification: after UI changes, verify the affected flows with a real browser (desktop
  + 375px mobile), including console cleanliness, before claiming done.
- Commits: the sandbox auto-commits with opaque messages on `main`; keep the tree green so any
  snapshot is releasable. `worklog.md` carries the human-readable history.
