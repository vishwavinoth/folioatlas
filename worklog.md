# FolioAtlas — Multi-Agent Worklog

---
Task ID: 1
Agent: main (Z.ai)
Task: Phase 1 — Repository, source, and design inspection for FolioAtlas build

Work Log:
- Loaded fullstack-dev skill; initialized Next.js 16 + shadcn/ui + Tailwind 4 environment
- Read full PRD at /home/z/my-project/upload/PRD.md
- Fetched upstream README: https://raw.githubusercontent.com/emmabostian/developer-portfolios/master/README.md (default branch is `master`, NOT `main`; api.github.com rate-limited from sandbox)
- Verified format: `## A`–`## Z` sections; entries `- [Name](url) [Optional Role]`; header count 2072 == list count 2072
- Edge cases found: 1 malformed entry (`- [Md Mizan] (url)` space before paren), 61 http:// vs 2015 https://, 0 credentials, 0 duplicate URLs, 8 duplicate names (different people), Unicode names present

Stage Summary:
- Stack: Next.js 16 App Router + TS strict + Tailwind 4 + shadcn/ui + next-themes + lucide-react
- CONSTRAINT: sandbox preview exposes only `/` route → PRD IA will be implemented as a hash-routed SPA on `/` (shareable `#/portfolios?q=...` URLs); robots.ts/sitemap.ts metadata routes still added
- Data strategy: sync script generates src/data/portfolios.generated.json (committed artifact); app embeds it server-side; client-side interactive search/filter/sort/pagination
- Classification: deterministic keyword rules over source-supplied role text ONLY (never URL inference) per PRD §7.7

---
Task ID: 2
Agent: main (Z.ai)
Task: Phase 2 — Data pipeline (fetch → parse → validate → dedupe → classify → artifacts)

Work Log:
- Built pure pipeline modules: src/lib/portfolio/{types,url,parse,classify,identity,directory}.ts
- Built scripts/sync-portfolios.ts (retry/backoff fetch, default-branch resolution, atomic tmp→validate→rename publish, 50%-drop safety gate, --check mode)
- Parser recovers real upstream anomalies with warnings: quote typos in URLs, secondary markdown links, punctuation garbage, nested brackets, lenient ] ( spacing; quarantines unparseable entries
- Classification: 30 documented rules over supplied role text ONLY; deterministic IDs sha1(name|url)
- Generated: src/data/portfolios.generated.json (2072 portfolios, 30 categories, 1018 classified, commit f1ace59) + sync-report.generated.json
- 50/50 bun unit tests pass (parse, URL validation, classification, identity, search/filter/sort/pagination)

Stage Summary:
- Upstream snapshot fully traceable; safety gates refuse publishing corrupted/empty data
- Next: design system (globals.css glass materials), then SPA UI on /

---
Task ID: 3
Agent: main (Z.ai)
Task: Phases 3–7 — Design system, core directory, SEO, hardening, release docs

Work Log:
- Design system (globals.css): Apple-inspired tokens (#F5F5F7/#101114/#0A84FF), glass-regular/glass-clear materials with specular highlights, @supports backdrop-filter fallback, prefers-reduced-motion kill-switch, ambient static gradient backdrop, focus-visible rings, system font stack
- Hash-router SPA on `/` (sandbox exposes only root route): shareable #/portfolios?q=…&tech=…&sort=…&page=…, replace-navigation for transient query updates (no history spam), push for view changes
- Built components: GlassNavigation (+mobile menu, esc/click-outside), ThemeToggle (light/dark/system, hydration-safe via useSyncExternalStore), GlassSearchField (debounced, clearable), GlassFilterBar (sort + focus-area glass popovers + removable chips), AlphabetNavigator (counts, disabled empties), PortfolioCard (restrained content surface, copy button, external indicator), Pagination (windowed, aria-current), EmptyState/ErrorState/NotFoundState/LoadingSkeleton, SiteFooter (freshness + commit + attribution)
- Views: Home (hero + verified count + deterministic sample + A–Z + focus areas + transparency), Directory, Technologies, About/Methodology (30 documented classification rules)/Privacy, 404
- SEO: per-view document.title, metadata + canonical + OG image (scripts/generate-og.ts → public/og.png with real stats), app/sitemap.ts + app/robots.ts (public/robots.txt removed), JSON-LD WebSite + SearchAction
- Fixed lint (react-hooks/set-state-in-effect → render-time adjustment + useSyncExternalStore patterns); hydration-safe router init ("#/" + queueMicrotask align)
- E2E verified via agent-browser: home light/dark, search→directory URL sync (62 react results), tech dropdown (AI/ML), letter routes (M: 9 pages, X: 1), pagination (24/page, scroll-top), technologies index (30) + flutter route (15), empty state, 404, mobile 375px (menu open/navigate/close, no overflow), footer push, back/forward, zero console/page errors
- Docs: README (pipeline/deploy/rollback), .env.example, ci.yml (lint+test+data validation+build), sync-portfolios.yml (daily cron → PR workflow)

Stage Summary:
- 2,072/2,072 upstream entries live; lint clean; 50/50 tests; sitemap/robots serving; browser-verified end-to-end

---
Task ID: 4
Agent: main (Z.ai)
Task: Phase 8-14 — AI-enhanced upgrade (growth analytics, database layer, AI search/summaries, detail pages, previews, shortcuts, Supabase kit)

Work Log:
- Prisma schema rewritten 1:1 to PRD §8: portfolios, portfolio_ai_summaries, portfolio_previews, sync_runs, portfolio_count_snapshots (indexes, defaults, FKs, cascade)
- scripts/seed-db.ts: mined VERIFIED upstream git history (cloned emmabostian/developer-portfolios, 3,715 README commits walked) → per-entry first_seen_at/last_seen_at/source_updated_at from real commits; 3,713 git-history snapshots with commit SHAs; idempotent upserts; sync_runs + sync-run snapshot recorded
- Store layer (src/lib/store/queries.ts): server-side keyword search (token AND across name/role/url/tech), tech multi-select (AND, exact JSON-token match), collection unions, letter/site/hasSummary/addedWithin filters, relevance scoring, detail + related (overlap-ranked), stats, growth bucketing (day/week/month), recently-added, featured (transparent criteria), collections (real union counts), related technologies (co-occurrence), letter counts
- API routes: /api/search, /api/stats (60s cache), /api/growth, /api/portfolios/[slug], /api/technologies, /api/preview/[slug] (302, provider server-side, rate-limited), /api/ai/search (10/min), /api/ai/summaries (6/min); src/lib/server/{request,rate-limit,preview,hash}.ts
- AI layer: provider.ts (Groq OpenAI-compatible JSON mode via GROQ_API_KEY/GROQ_MODEL; z-ai-web-dev-sdk fallback; extractJson tolerant parser), search-intent.ts (zod schema, canonical-vocabulary validation — unknown slugs dropped, plan builder), summaries.ts (grounded-only prompt, schema validation, DB persistence, status/error tracking, insufficient-data guard)
- Client: PortfolioCard v2 (avatar fallback, preview image with skeleton/error states, AI badge, Details/Preview/Open actions, copy link); PreviewImage + PreviewDialog (iframe attempt + timeout notice + always-visible open-in-new-tab, sandboxed, no security bypass); PortfolioDetail (identity, View GitHub Profile, attribution rules, AI summary card with generate/regenerate, focus areas, metadata panel, related grid, share/copy, JSON-LD ProfilePage, per-view title/meta); HomeView v2 (hero + verified stats, GrowthChart with 30d/90d/1y/all + accessible labels + honest empty state, recently added, collections, featured, explore CTA, A-Z, transparency); DirectoryView v2 (keyword/AI mode toggle, advanced filter popovers, chips, clear-all, server-backed pagination, skeletons, suggestions in empty state); TechnologiesView + TechnologyLandingView (blurb, live count, related techs); Collections routes with OR-semantics via ?collection=
- Command palette (cmdk, API-driven results with controlled selection so Enter opens the top result, ⌘/Ctrl+Enter new tab) + ShortcutsHelp + use-shortcuts hook (/, ⌘K, Esc, ?, editable-target guard, modal-aware); nav Quick find button
- page.tsx slimmed: portfolio payload removed from client bundle (API serves it); sitemap/robots intact
- Content pages updated: methodology (verified growth history, AI guardrails, previews), privacy (search on server, AI query disclosure)
- Fixed: Radix useId hydration mismatch (DialogHeader moved inside portal content), cmdk native filtering vs API results (shouldFilter=false + controlled value), React hooks lint (render-time adjustment patterns), letter query-param direct links, collection filtering
- Tests: +24 new (search-intent validation/clamping, growth bucketing/add-accounting/provenance, extractJson, preview provider resolution + credential safety, GitHub identity derivation) → 74/74 pass; lint clean; tsc src/ clean
- Supabase kit: supabase/migrations/0001_init.sql (Postgres schema + GIN index + RLS public-read/service-role-write) + supabase/README.md (6-step setup, verification SQL, security invariants) — NOT executed/verified (no credentials in sandbox); .env.example rewritten (DATABASE_URL, GROQ_*, PREVIEW_*, SCREENSHOT_ONE_*, SUPABASE_*, EMBEDDING_*); README.md fully updated
- E2E verified via agent-browser: home light/dark + stats, growth chart (real dip in Feb 2026 confirmed genuine upstream history — NOT smoothed), directory search URL-sync (62 react results), filters (letter a: 388 = artifact count), pagination, tech landing (Next.js 30, related counts), collections (frontend-craft 220), detail page (real preview, AI summary generated + grounded), AI search (interpretation + intent chips + 2 real results), palette live search + Enter navigation, / ? Esc shortcuts, ? correct ignored while typing, mobile 375px, footer push, console clean

Stage Summary:
- Everything backed by real data: 2,072 portfolios, 3,714 snapshots (2019-09-13 → 2026-10-26 verified range), 276 inferred GitHub identities, 1 generated AI summary in DB
- AI provider works in-sandbox via z-ai fallback; Groq activates when GROQ_API_KEY set; graceful degradation everywhere
- Supabase documented as optional production path, honestly marked unverified; local Prisma/SQLite layer is the working persistence
