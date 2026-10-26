# Test Backlog & Pending Workstream — FolioAtlas

Prioritized list of pending test work and engineering backlog. Everything the platform promises
today is verified (see `QA_STATUS.md`); this file is what remains to harden, automate, or unlock.

Legend: P1 = next up · P2 = should have · P3 = nice to have · ⛔ = blocked on external credentials.

---

## A. Testing backlog

### T-01 · API route integration tests — P1
Automated tests hitting the route handlers directly (not via network) with a seeded test
database: `/api/search` (all filter/sort/pagination params + invalid-param rejection),
`/api/stats` (cache behavior), `/api/growth` (range edge cases), `/api/portfolios/[slug]`
(404 + related), `/api/technologies` (list + slug), `/api/preview/[slug]` (provider resolution,
rate limit, 404), `/api/ai/search` (mock provider: valid intent / invalid JSON / provider-down
fallback), `/api/ai/summaries` (mock provider: persist, reuse, error status).

### T-02 · Playwright E2E suite — P1
Codify the manual browser matrix from `QA_STATUS.md` §2 into `tests/e2e/`: home render +
theme toggle, search URL-sync, filters + chips, pagination, technology landing, collections,
detail page (preview dialog + AI summary display), palette + shortcuts, mobile 375px, zero console
errors. Run in CI (`ci.yml`) against a production build.

### T-03 · Accessibility automated audit — P1
`@axe-core/playwright` sweep over all views; verify focus traps in dialogs/palette, `aria-current`
on pagination, live-region announcements for search status, reduced-motion branch rendering.

### T-04 · Visual regression — P2
Screenshot baselines for home (light/dark), directory, detail, technology landing at 375/768/1440.
The `tool-results/verify-*.png` captures are the ad-hoc starting set.

### T-05 · Performance budget — P2
Lighthouse CI on the production build: LCP/CLS/INP targets from PRD §16; bundle-size budget for
the client chunk after the payload-slimming change; verify the 60s stats cache behavior under
load.

### T-06 · Sync pipeline failure-injection tests — P2
Unit-test the safety gates with malformed upstream inputs: 50%-drop gate, quarantine path,
atomic-publish rollback (tmp → validate → rename), `--check` mode exit codes, retry/backoff on
simulated 5xx.

### T-07 · AI provider contract tests — P2
With a mocked OpenAI-compatible endpoint: JSON-mode requests, malformed-JSON recovery via
`extractJson`, rate-limit handling, `GROQ_MODEL` override propagation, token-absent fallback
ordering (Groq → keyword). ⛔ Real-Groq smoke test additionally pending a key (KI-4).

### T-08 · Automated seed idempotency test — P2
Verified manually against a local Postgres (2026-10-26: second run → 0 inserted / 2,072 updated,
no duplicates). Automate it in CI with a Postgres service container + Supabase CLI.

### T-09 · Interrupted sync-run cleanup — P3
`seed-db.ts` marks failed runs `failed`, but a killed process leaves `running`. Add a step that
marks `running` rows older than a threshold as `failed`.

### T-10 · Live Supabase smoke test — P2
After provisioning: run the RLS verification SQL in `supabase/README.md` and hit `GET /api`.

## B. Feature backlog (post-MVP, from PRD §20 + discovered needs)

- **B-01 · Batch AI summary generation** — queue + budget for generating summaries for popular
  entries on a schedule (today: on-demand only, 2 complete).
- **B-02 · pgvector semantic search** — embeddings provider + `EMBEDDING_*` env plumbing is
  stubbed; implement column, backfill job, hybrid ranking. ⛔ needs provider decision.
- **B-03 · Path-route deployment mode** — feature-flag to emit canonical path routes + rewritten
  sitemap when the host serves full routing (resolves KI-2 at deploy time).
- **B-04 · Preview capture persistence** — store captured images (storage key) instead of live
  provider redirects for stability; bookkeeping table already exists.
- **B-05 · Contribution/submit flow** — issue-template driven submission pipeline into the
  upstream repo (read-only today by design).
- **B-06 · Per-entry change detection feed** — surface "newly added / recently changed" from
  `source_updated_at` as a browsable feed.
- **B-07 · Search quality eval set** — golden queries (intent → expected slugs) run in CI against
  both keyword and AI modes to catch ranking regressions.

## C. Documentation debt

- [x] README quick start + env table (current)
- [x] agent.md operating guide (this release)
- [x] PRD.md living status (this release)
- [x] CHANGELOG.md (this release)
- [x] QA_STATUS.md (this release)
- [ ] CONTRIBUTING.md once external contributions are accepted
- [ ] Ops runbook (restore drill, sync-failure response)
