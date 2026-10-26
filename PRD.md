# FolioAtlas — Product Requirements Document (Living)

> **Status:** Implemented through v0.5.0 · Last updated 2026-10-26
> This is the living PRD for the implemented product. The original frozen build brief is preserved
> at `upload/PRD.md` (verbatim, 22 sections); where the two disagree, this document reflects what
> was actually built and verified. Requirement status: ✅ implemented & verified · ⚠️ partial ·
> ⛔ blocked (needs external credentials).

---

## 1. Product vision

FolioAtlas is a polished, searchable, SEO-optimized public directory of real developer
portfolios, sourced exclusively from the open-source GitHub repository
[`emmabostian/developer-portfolios`](https://github.com/emmabostian/developer-portfolios),
presented with an Apple Liquid Glass-inspired interface.

**Product promise.** Every entry is real, every number is verifiable, every AI output is
labeled and grounded. The platform never fabricates portfolios, growth history, previews,
credentials, or ownership claims.

**Non-negotiable requirements (inherited from the master brief):**

| # | Requirement | Status |
|---|---|---|
| 1 | All entries from the upstream repo, nothing invented | ✅ 2,072/2,072 valid entries; parser recovers 1 known anomaly with warnings |
| 2 | No fabricated growth metrics — verified history only | ✅ 3,714 snapshots: 3,713 from real upstream commits (SHAs recorded) + 1 recorded sync run |
| 3 | No hardcoded AI responses | ✅ Server-side provider calls with zod-validated structured output; graceful degradation |
| 4 | No non-functional buttons | ✅ Every interactive control verified end-to-end in a real browser |
| 5 | Honest attribution | ✅ GitHub profile links labeled `inferred` when derived from a github.io domain only (276 such identities); authorship claimed only where the source supports it |
| 6 | Secrets stay server-side | ✅ Provider credentials resolve server-side; client bundle contains no tokens |

## 2. Users and journeys

**Audience:** developers seeking inspiration and reference real-world portfolio examples;
recruiters evaluating candidates' public work; engineering leaders studying portfolio presentation.

**Core journeys (all verified in-browser):**

- **Discover** — Home hero → verified stats → growth chart → collections → featured → A–Z.
- **Search** — keyword search (server-side, debounced, URL-synced) or AI natural-language search
  (typed intent → real DB query → "why it matched" chips). Both shareable by URL.
- **Explore a technology** — `/technologies` index → landing page with live count, blurb, related
  technologies (co-occurrence-ranked).
- **Browse alphabetically** — letter navigator with real counts; disabled letters for empty buckets.
- **Inspect a portfolio** — detail view: identity, website preview dialog, AI summary (labeled),
  focus areas, related portfolios, source & verification panel.
- **Handle unavailable data** — explicit empty / error / not-found (HTTP 404) / embedding-blocked states;
  a failed upstream fetch never deletes stored records.

## 3. Information architecture

Clean, server-rendered path routes with per-route metadata and real 404 status codes; filter
state lives in the query string (`/portfolios?q=react&tech=nextjs&sort=relevance&page=3`).
Legacy `/#/…` links redirect. Route table:

| Route | Purpose | Status |
|---|---|---|
| `/` | Home: hero, verified stats, growth chart, recently added, collections, featured | ✅ |
| `/portfolios` | Directory: search, AI-search toggle, filters, sort, pagination | ✅ |
| `/portfolios/letter/{a–z}` | Alphabetical browsing | ✅ |
| `/portfolio/{slug}` | Developer profile page (JSON-LD `BreadcrumbList`) | ✅ |
| `/technologies`, `/technologies/{slug}` | Focus-area index + landing pages | ✅ |
| `/collections/{slug}` | Curated collection (union semantics) | ✅ |
| `/about`, `/methodology`, `/privacy` | Content pages incl. AI guardrails + provenance | ✅ |

## 4. Design system — Apple Liquid Glass

✅ Implemented in `src/app/globals.css`:

- Tokens: `#F5F5F7` light / `#101114` dark canvas, `#0A84FF` accent.
- Materials: `glass-regular` and `glass-clear` with specular highlights; `@supports
  (backdrop-filter)` fallback to translucent fills; `prefers-reduced-motion` kill-switch.
- Functional layer (navigation/search chrome) floats above the content layer; glass reveals
  content without competing with it.
- Light/dark/system theme with hydration-safe rendering (`useSyncExternalStore`); no flash of
  wrong theme; `focus-visible` rings throughout.
- Typography: system font stack; restrained hierarchy tuned for directory scanning.

## 5. Data pipeline (source of truth)

✅ Implemented — `scripts/sync-portfolios.ts` → artifacts; `scripts/seed-db.ts` → Supabase.

```
Upstream GitHub repo (README.md, branch auto-resolved)
  → fetch with retry/backoff (optional GITHUB_TOKEN)
  → parse (deterministic parser for the real "- [Name](url) [Role]" format;
    documented recoveries for real anomalies, quarantine for junk)
  → validate + normalize URLs (http/https only; no credentials, no private hosts)
  → dedupe (identity = normalized URL; collisions reported, never silently dropped)
  → classify (30 documented keyword rules applied ONLY to upstream role text)
  → atomic publish (tmp → validate → rename; a failed sync never erases good data)
  → src/data/portfolios.generated.json + src/data/sync-report.generated.json
  → seed: replay upstream git history for first_seen_at / source_updated_at
  → database with sync_runs + portfolio_count_snapshots bookkeeping
```

**Verified pipeline facts:** upstream header count == list count == 2,072; 61 `http://` vs 2,015
`https://` entries preserved as-is; 0 credentials/_duplicates in source; 8 duplicate *names*
correctly disambiguated by URL identity; snapshot at upstream commit `f1ace59`.

**Growth honesty rule (PRD red line):** the growth chart is fed exclusively by
`portfolio_count_snapshots` rows carrying per-row provenance (`git-history` + commit SHA, or
`sync-run`). "Added in period" is summed per bucket so each entry counts as new exactly once;
real upstream dips (e.g. a temporarily truncated README in Feb 2026) remain visible — no
smoothing, no interpolation, no fabrication from a single report.

## 6. Search, filtering, AI

| Capability | Behavior | Status |
|---|---|---|
| Keyword search | Server-side token AND across name/role/url/technologies; debounced; URL-synced; relevance/name/newest sort; server-side pagination | ✅ |
| Advanced filters | Multi focus-area (AND), site type, has-AI-summary, added-within window (verified dates); chips + clear-all; every state shareable | ✅ |
| AI search (optional) | Hidden unless `GROQ_API_KEY` is set (no non-functional controls). Natural language → zod-validated intent restricted to the canonical vocabulary → real DB query → transparent "why matched" display; falls back to keyword search when no provider | ✅ (Groq path needs `GROQ_API_KEY`; verified in-sandbox via built-in provider fallback) |
| AI summaries | Grounded-only prompt, schema-validated, persisted in DB with model/status/source-hash; reused, never regenerated per view; explicitly labeled AI-generated | ✅ 2 summaries generated & persisted; on-demand; batch refresh ⚠️ pending |
| Command palette | `⌘K`/`Ctrl+K`, live API-driven results, controlled selection so Enter opens the top result, `⌘/Ctrl+Enter` new tab | ✅ |

**Keyboard shortcuts** (never hijack typing; modal-aware; editable-target guard):
`/` focus search · `⌘/Ctrl+K` palette · `Esc` close topmost layer · `Enter` activate ·
`↑ ↓` navigate · `⌘/Ctrl+Enter` open in new tab · `?` shortcuts help panel.

## 7. Website previews

✅ No third-party screenshot service (decision 2026-10-26). Cards are text-first (no
thumbnails); the in-page preview dialog embeds the site itself on demand. Sites that block embedding get
a graceful notice with an always-available open-in-new-tab action.

## 8. Data model

Supabase Postgres is the only database: `supabase/migrations/` (schema + GIN index + RLS +
API grants). Four tables: `portfolios`, `portfolio_ai_summaries`, `sync_runs`,
`portfolio_count_snapshots`. Setup and RLS verification: `supabase/README.md`.

**Expected contents after `bun run db:seed` (verified against a local Postgres, 2026-10-26):**

| Table | Rows | Notes |
|---|---|---|
| portfolios | 2,072 | 276 with inferred GitHub identity; 1,213 with upstream role text |
| portfolio_count_snapshots | 3,714 | 3,713 git-history + 1 sync-run per seed; span 2019-09-13 → present |
| sync_runs | 1 per seed | Failed runs are marked `failed` with an error summary |
| portfolio_ai_summaries | grows on demand | Generated via `POST /api/ai/summaries` (needs `GROQ_API_KEY`) |

## 9. Security & privacy

✅ Implemented: URL validation rejects credentials/private hosts/dangerous schemes; no
third-party screenshot calls; AI layer is the security boundary (unknown slugs dropped, output
shapes clamped by zod); rate limiting on AI endpoints (10/min search, 6/min summaries) and
previews; parameterized Supabase queries; service-role keys server-only; search queries processed
server-side (disclosed in the privacy page); `rel="noopener noreferrer"` on external links.

## 10. SEO

✅ Server-rendered per-route titles/descriptions, canonical URLs from the single configured origin,
OG image generated from real stats (`scripts/generate-og.ts`), Twitter cards, JSON-LD (`WebSite` +
`SearchAction` on home, `BreadcrumbList` elsewhere), real 404s, `noindex` on query URLs.
`/sitemap.xml` lists only canonical pages with sufficient content and uses the real sync time as
`lastmod`; `/robots.txt` blocks `/api/` and disallows everything on non-production deployments.

## 11. Performance targets

✅ Server-side search/pagination (no full-table client pulls); 60s stats cache; indexed queries
(letter, firstSeen, lastSeen, name, slug, status, provenance); payload slimmed so the portfolio
dataset is served by API, not shipped in the client bundle. ⚠️ Core Web Vitals measured run
pending (see TEST_BACKLOG).

## 12. Acceptance criteria — final state

- [x] Every valid upstream entry represented (2,072/2,072)
- [x] Growth history from verified commits + sync snapshots, provenance labeled per point
- [x] Keyword search, AI search, advanced filters, sorting, pagination — URL-shareable
- [x] Detail pages with previews, AI summaries, honest attribution, related portfolios
- [x] Keyboard shortcuts + help panel, command palette
- [x] Loading/empty/error/not-found states; reduced-motion and backdrop-filter fallbacks
- [x] Light/dark/system themes without hydration mismatch
- [x] SEO metadata suite; sitemap; robots
- [x] 74/74 unit tests; lint clean; `tsc --noEmit` clean; production build clean
- [x] Browser-verified end-to-end (home, directory, filters, tech pages, collections, detail,
      AI search, palette, shortcuts, mobile 375px, console clean)
- [ ] Automated E2E suite (Playwright) — pending, see TEST_BACKLOG.md
- [ ] Supabase production verification — blocked on credentials
