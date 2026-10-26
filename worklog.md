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
