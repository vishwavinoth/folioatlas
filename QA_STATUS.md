# QA Status — FolioAtlas

**Snapshot:** 2026-10-26 · **Version:** 0.5.0 · **Data:** upstream commit `f1ace59` · **Production:** Vercel + Supabase

## 1. Automated gates

| Gate | Command | Result |
|---|---|---|
| Lint | `bun run lint` | ✅ 0 problems |
| Typecheck | `bun run typecheck` | ✅ 0 errors |
| Unit tests | `bun test` | ✅ 81/81 pass (parser, URLs, classification, catalog search/filter/sort/related, AI intent validation, growth bucketing) |
| Production build | `bun run build` | ✅ catch-all page route + 8 API routes + sitemap/robots/icon |
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

## 4. Data integrity

- 2,072/2,072 valid upstream entries in Supabase; 3,714 growth snapshots (3,713 `git-history` with SHAs + sync runs).
- 276 GitHub identities labeled `inferred` (github.io derivation only).
- RLS verified: publishable key can read, writes rejected; secret key writes.

## 5. Known gaps

| ID | Gap | Severity | Next step |
|---|---|---|---|
| KI-1 | Directory results and detail content load client-side after the server-rendered shell (titles/meta/headings are server-rendered) | Low | Pass initial data from the server page if search-engine snippets need entry lists |
| KI-2 | Groq path untested with a real `GROQ_API_KEY` | Medium | Set the key, then run AI search + summary once |
| KI-3 | No automated E2E suite in CI (verified with ad-hoc Playwright scripts) | Medium | TEST_BACKLOG T-02 |
