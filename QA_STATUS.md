# QA Status — FolioAtlas

**Snapshot:** 2026-11-11 · **Version:** 1.1.0 · **Data:** upstream commit `d52f88a` (synced daily) · **Production:** Vercel + Supabase

## 1. Automated gates

| Gate | Command | Result |
|---|---|---|
| Lint | `bun run lint` | ✅ 0 problems |
| Typecheck | `bun run typecheck` | ✅ 0 errors |
| Unit tests | `bun test` | ✅ 96/96 pass (parser, URLs, classification, catalog search/filter/sort/related, AI intent validation, growth bucketing, leaderboard periods, anonymous hashing, bot filtering) |
| Production build | `bun run build` | ✅ catch-all page + 11 API routes + OG image route + sitemap/robots/llms/manifest/icons |
| Client bundle | grep `.next/static` for secret env names | ✅ none |

## 2. Routing & SEO (production build, real Supabase data)

| Check | Result |
|---|---|
| `/`, `/portfolios`, `/portfolios/letter/a`, `/portfolio/{slug}`, `/technologies`, `/technologies/react`, `/collections/{slug}`, `/about`, `/methodology`, `/privacy` | ✅ 200, unique server-rendered title, description and canonical |
| Unknown path, bad letter, unknown technology/collection/portfolio slug | ✅ HTTP 404 with `noindex` |
| Search/filter URLs (`/portfolios?q=react`) | ✅ shareable, canonical to `/portfolios`, `noindex, follow` |
| Legacy `/#/…` links | ✅ redirect to clean path |
| `/sitemap.xml` | ✅ 62 canonical URLs, real sync time as `lastmod`, no query/empty pages |
| `/robots.txt` | ✅ production: allow `/`, disallow `/api/`; non-production: disallow all |
| JSON-LD | ✅ `WebSite` + `SearchAction` on home, `BreadcrumbList` elsewhere; `<` escaped |

## 3. Browser verification (Chromium, 1366×900 and 375×812, light + dark)

| Flow | Result |
|---|---|
| Client-side navigation via nav, cards, palette (no full reloads) | ✅ |
| Keyword search updates URL; results from Supabase ("react" → 62) | ✅ |
| Card actions fit every grid width (no overflow) | ✅ |
| Detail page: Website card, share, source & verification, related | ✅ |
| AI controls hidden when `GROQ_API_KEY` is unset | ✅ |
| Shortcuts: `/` focuses search, `⌘/Ctrl+K` palette, Enter opens top result | ✅ |
| Mobile menu: navigate + theme control, no horizontal overflow | ✅ |
| Hydration / console errors across all routes | ✅ none (except the intended 404 on unknown paths) |

## 3b. Engagement + SEO (local Postgres with Supabase roles, production build)

| Check | Result |
|---|---|
| Migration 0003 applies twice; anon cannot read raw rows or call write functions | ✅ |
| Like once per visitor (idempotent), per-network daily cap, unlike, view/visit dedupe per day | ✅ |
| Browser: view counted on profile load, like toggles + persists, "Visit website" counts a visit, 2nd visitor like from a card | ✅ |
| Leaderboard daily/weekly/monthly/yearly/all, home "Trending this week", bot UA ignored, invalid input 400 | ✅ |
| Server HTML contains real portfolio links (24 per listing page), JSON-LD graph per page type | ✅ |
| Titles ≤ 60 chars, descriptions ≤ 160, thin profiles noindex, sitemap 1,319 URLs with real lastmod | ✅ |
| robots.txt (AI crawlers), llms.txt, llms-full.txt, manifest, icons, security headers, social cards | ✅ |
| 0 horizontal overflow across 6 pages × 5 widths (320–1440) × light/dark; no hydration errors | ✅ |

## 4. Data integrity

- 2,110/2,110 valid upstream entries in Supabase (daily sync via GitHub Actions); growth snapshots from 3,713 `git-history` commits (with SHAs) plus one per sync run.
- 276 GitHub identities labeled `inferred` (github.io derivation only).
- RLS verified: publishable key can read, writes rejected; secret key writes.

## 5. Known gaps

| ID | Gap | Severity | Next step |
|---|---|---|---|
| KI-2 | Groq path untested with a real `GROQ_API_KEY` | Medium | Set the key, then run AI search + summary once |
| KI-3 | No automated E2E suite in CI (verified with ad-hoc Playwright scripts) | Medium | TEST_BACKLOG T-02 |
