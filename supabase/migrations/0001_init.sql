-- FolioAtlas — Supabase/Postgres schema (PRD §8)
-- Mirrors prisma/schema.prisma 1:1 so the same data model runs on SQLite
-- (local) and Postgres/Supabase (production).
--
-- Apply with:  supabase db push   (or psql -f this-file)
-- Every table enables Row Level Security. The public directory data is
-- readable by the anon role; ALL writes require the service role (server-side
-- only — never expose SUPABASE_SERVICE_ROLE_KEY to a browser).

-- ── portfolios ──────────────────────────────────────────────────────────────
create table if not exists public.portfolios (
  id                text primary key,
  slug              text not null unique,
  name              text not null,
  github_username   text,
  github_profile_url text,
  github_source     text not null default 'none'
                    check (github_source in ('none', 'inferred-domain')),
  portfolio_url     text not null,
  avatar_url        text,
  role              text,
  description       text,
  technologies      jsonb not null default '[]'::jsonb,
  letter            text not null,
  source_section    text not null default '',
  source_repository text not null,
  source_line       integer,
  source_entry_hash text not null,
  first_seen_at     timestamptz not null,
  last_seen_at      timestamptz not null,
  source_updated_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists portfolios_letter_idx      on public.portfolios (letter);
create index if not exists portfolios_first_seen_idx  on public.portfolios (first_seen_at desc);
create index if not exists portfolios_last_seen_idx   on public.portfolios (last_seen_at desc);
create index if not exists portfolios_name_idx        on public.portfolios (name);
-- Fast "entry carries this technology" containment queries:
create index if not exists portfolios_technologies_idx on public.portfolios using gin (technologies);

-- ── portfolio_ai_summaries ──────────────────────────────────────────────────
create table if not exists public.portfolio_ai_summaries (
  id               uuid primary key default gen_random_uuid(),
  portfolio_id     text not null unique references public.portfolios (id) on delete cascade,
  summary          text not null default '',
  key_technologies jsonb not null default '[]'::jsonb,
  specialties      jsonb not null default '[]'::jsonb,
  source_hash      text not null,
  model            text not null default '',
  status           text not null default 'pending'
                   check (status in ('pending', 'complete', 'failed')),
  generated_at     timestamptz,
  error_code       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists ai_summaries_status_idx on public.portfolio_ai_summaries (status);

-- ── portfolio_previews ──────────────────────────────────────────────────────
create table if not exists public.portfolio_previews (
  id             uuid primary key default gen_random_uuid(),
  portfolio_id   text not null unique references public.portfolios (id) on delete cascade,
  image_url      text,
  provider       text,
  status         text not null default 'pending'
                 check (status in ('pending', 'ready', 'unavailable')),
  captured_at    timestamptz,
  source_url_hash text not null,
  error_code     text,
  updated_at     timestamptz not null default now()
);

-- ── sync_runs ───────────────────────────────────────────────────────────────
create table if not exists public.sync_runs (
  id                       uuid primary key default gen_random_uuid(),
  started_at               timestamptz not null,
  completed_at             timestamptz,
  status                   text not null default 'running'
                           check (status in ('running', 'success', 'failed')),
  trigger                  text not null default 'manual'
                           check (trigger in ('manual', 'seed', 'cron', 'github-action')),
  source_commit_sha        text,
  source_entry_count       integer,
  inserted_count           integer,
  updated_count            integer,
  removed_or_missing_count integer,
  error_summary            text
);

create index if not exists sync_runs_status_idx   on public.sync_runs (status);
create index if not exists sync_runs_started_idx  on public.sync_runs (started_at desc);

-- ── portfolio_count_snapshots ───────────────────────────────────────────────
create table if not exists public.portfolio_count_snapshots (
  id                uuid primary key default gen_random_uuid(),
  sync_run_id       uuid references public.sync_runs (id) on delete set null,
  recorded_at       timestamptz not null,
  total_portfolios  integer not null,
  portfolios_added  integer not null default 0,
  portfolios_updated integer not null default 0,
  provenance        text not null default 'sync-run'
                    check (provenance in ('git-history', 'sync-run')),
  source_commit_sha text
);

create index if not exists snapshots_recorded_idx on public.portfolio_count_snapshots (recorded_at);
create index if not exists snapshots_provenance_idx on public.portfolio_count_snapshots (provenance);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Public read for directory-facing tables; NO anon/authenticated writes.
-- Privileged writes happen exclusively through the server (service role),
-- which bypasses RLS by design.

alter table public.portfolios              enable row level security;
alter table public.portfolio_ai_summaries  enable row level security;
alter table public.portfolio_previews      enable row level security;
alter table public.sync_runs               enable row level security;
alter table public.portfolio_count_snapshots enable row level security;

drop policy if exists "public read portfolios" on public.portfolios;
create policy "public read portfolios"
  on public.portfolios for select to anon, authenticated using (true);

drop policy if exists "public read ai summaries" on public.portfolio_ai_summaries;
create policy "public read ai summaries"
  on public.portfolio_ai_summaries for select to anon, authenticated using (true);

drop policy if exists "public read previews" on public.portfolio_previews;
create policy "public read previews"
  on public.portfolio_previews for select to anon, authenticated using (true);

drop policy if exists "public read sync runs" on public.sync_runs;
create policy "public read sync runs"
  on public.sync_runs for select to anon, authenticated using (true);

drop policy if exists "public read snapshots" on public.portfolio_count_snapshots;
create policy "public read snapshots"
  on public.portfolio_count_snapshots for select to anon, authenticated using (true);
