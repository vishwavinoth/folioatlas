# QA Status — FolioAtlas

**Snapshot date:** 2026-10-27 · **Branch:** `main` · **Data snapshot:** upstream commit `f1ace59`

## 1. Automated gates (verified 2026-10-27)

| Gate | Command | Result | Notes |
|---|---|---|---|
| Unit tests | `bun test` | ✅ **74/74 pass** (0 fail, 293 expect calls, ~100ms) | 7 files: parse, url, classify+identity, directory (search/filter/sort/pagination), AI search-intent validation, growth bucketing/provenance, preview provider + credential safety |
| Lint | `bun run lint` | ✅ **0 problems** | ESLint 9 + next config |
| Typecheck | `bunx tsc --noEmit` | ✅ **0 errors** | Whole repo (tests included via bun-types refs; scaffolding excluded) |
| Production build | `bun run build` | ✅ **success, 13 routes** | Static: `/`, `/_not-found`, `/icon.svg`, `/robots.txt`, `/sitemap.xml`; dynamic: 8 API routes |

## 2. Manual end-to-end verification (real browser, 2026-10-26 → recorded)

| Flow | Result |
|---|---|
| Home light + dark, verified stats render | ✅ |
| Growth chart with real data — including the genuine Feb 2026 upstream dip (left visible, not smoothed) | ✅ |
| Directory keyword search URL-sync ("react" → 62 results) | ✅ |
| Advanced filters (letter a: 388 == artifact count; multi tech AND; has-summary; added-within) | ✅ |
| Pagination (24/page, windowed, scroll-top) | ✅ |
| Technology index (30) + landing (Next.js: 30, related co-occurrence counts) | ✅ |
| Collections (union counts, e.g. frontend-craft: 220) | ✅ |
| Portfolio detail: real preview image, grounded AI summary generated + persisted, related grid, verification panel | ✅ |
| AI search: interpretation panel + intent chips + real DB results | ✅ (built-in provider fallback; Groq path requires `GROQ_API_KEY`) |
| Command palette live search + Enter navigation + ⌘/Ctrl+Enter new tab | ✅ |
| Shortcuts `/`, `⌘K`, `Esc`, `?` (correctly ignored while typing) | ✅ |
| Mobile 375px: menu open/navigate/close, no horizontal overflow | ✅ |
| Console: zero errors across all flows | ✅ |

## 3. Data integrity verification

- 2,072/2,072 valid upstream entries represented; 1 known anomaly recovered with warnings; junk quarantined in `sync-report.generated.json`.
- Growth series: 3,714 snapshots — 3,713 `git-history` (each with commit SHA) + 1 `sync-run`; span 2019-09-13 → 2026-10-26; add-accounting tested (`tests/unit/growth.test.ts`).
- 276 GitHub identities are all labeled `inferred` (github.io derivation); 0 URL-inferred claims otherwise.
- AI summaries: schema-validated, persisted (2 `complete`), reused from DB, labeled in UI.
- No secrets in client bundle (preview credentials resolve server-side; tested in `tests/unit/preview.test.ts`).

## 4. Known issues (tracked, non-blocking)

| ID | Issue | Severity | Disposition |
|---|---|---|---|
| KI-1 | 2 `SyncRun` rows stuck at `status='running'` from interrupted seed attempts (1 success row is correct) | Low | Reconcile script pending — see TEST_BACKLOG T-09 |
| KI-2 | Sandbox serves only `/` → hash-route URLs in production metadata until deployed off-sandbox | Medium (deploy-scoped) | Documented in README/PRD; swap to path routes when host allows |
| KI-3 | Supabase/Postgres kit written and documented but never executed | Medium | Blocked on credentials; setup steps in `supabase/README.md` |
| KI-4 | Groq integration untested with a real `GROQ_API_KEY` (verified via built-in fallback + contract tests) | Medium | Configure key and re-run AI flows; code path is identical |
| KI-5 | ScreenshotOne provider untested with a real key (public provider verified live) | Low | Configure key and verify one capture |

## 5. Test coverage snapshot

Covered now (74 tests): README parsing incl. real anomalies · URL validation/normalization ·
classification rules + uniqueness · deterministic identity/slug · search/filter/sort/pagination ·
AI intent validation + clamping + plan building · growth bucketing + add-accounting + provenance
labels · `extractJson` tolerance · preview provider resolution + credential safety · GitHub
identity derivation.

Not yet automated: see `TEST_BACKLOG.md` (API route integration, Playwright E2E, a11y, visual
regression, performance budget, Supabase parity).
