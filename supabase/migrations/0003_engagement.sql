-- FolioAtlas — visitor engagement: portfolio views, site visits and likes.
--
-- Privacy model: rows hold only salted hashes. `visitor_hash` derives from a
-- random ID kept in the visitor's browser (no cookies); `ip_hash` derives from
-- the IP *and the UTC day*, so it can only enforce same-day caps and cannot
-- link a visitor across days. Raw rows are never exposed to the Data API:
-- anon/authenticated can call the aggregate functions below and nothing else;
-- writes go through service_role-only functions called by the server.
--
-- Idempotent: safe to re-run.

-- ── likes (one per visitor per portfolio) ──────────────────────────────────
create table if not exists public.portfolio_reactions (
  portfolio_id text not null references public.portfolios (id) on delete cascade,
  visitor_hash text not null,
  ip_hash      text not null,
  created_at   timestamptz not null default now(),
  primary key (portfolio_id, visitor_hash)
);

create index if not exists portfolio_reactions_created_idx on public.portfolio_reactions (created_at);
create index if not exists portfolio_reactions_ip_idx on public.portfolio_reactions (ip_hash);

-- ── views + site visits (one per visitor, portfolio, kind and UTC day) ────
create table if not exists public.portfolio_events (
  id           bigint generated always as identity primary key,
  portfolio_id text not null references public.portfolios (id) on delete cascade,
  kind         text not null check (kind in ('view', 'visit')),
  visitor_hash text not null,
  ip_hash      text not null,
  day          date not null,
  created_at   timestamptz not null default now(),
  unique (portfolio_id, kind, visitor_hash, day)
);

create index if not exists portfolio_events_created_idx on public.portfolio_events (created_at);
create index if not exists portfolio_events_ip_day_idx on public.portfolio_events (ip_hash, day);

-- ── lock the raw tables down ───────────────────────────────────────────────
alter table public.portfolio_reactions enable row level security;
alter table public.portfolio_events enable row level security;
-- No policies on purpose: anon/authenticated can neither read nor write rows.
revoke all on table public.portfolio_reactions, public.portfolio_events from anon, authenticated;
grant select, insert, delete on table public.portfolio_reactions, public.portfolio_events to service_role;

-- ── public, aggregate-only reads ───────────────────────────────────────────

-- All-time counts for a set of portfolios (cards, detail pages).
create or replace function public.engagement_counts(p_ids text[])
returns table (portfolio_id text, likes bigint, views bigint, visits bigint)
language sql
stable
security definer
set search_path = public
as $$
  select i.id,
         (select count(*) from portfolio_reactions r where r.portfolio_id = i.id),
         (select count(*) from portfolio_events e where e.portfolio_id = i.id and e.kind = 'view'),
         (select count(*) from portfolio_events e where e.portfolio_id = i.id and e.kind = 'visit')
  from unnest(p_ids) as i(id)
  where cardinality(p_ids) <= 200;
$$;

-- Ranked activity within [p_from, p_to): likes first (or views), then the other
-- metric, then site visits. Only portfolios with activity in the window appear.
create or replace function public.engagement_leaderboard(
  p_from timestamptz,
  p_to timestamptz,
  p_metric text default 'likes',
  p_limit integer default 50
)
returns table (portfolio_id text, likes bigint, views bigint, visits bigint)
language sql
stable
security definer
set search_path = public
as $$
  with l as (
    select r.portfolio_id, count(*) as n
    from portfolio_reactions r
    where r.created_at >= p_from and r.created_at < p_to
    group by r.portfolio_id
  ), e as (
    select ev.portfolio_id,
           count(*) filter (where ev.kind = 'view') as v,
           count(*) filter (where ev.kind = 'visit') as c
    from portfolio_events ev
    where ev.created_at >= p_from and ev.created_at < p_to
    group by ev.portfolio_id
  ), m as (
    select coalesce(l.portfolio_id, e.portfolio_id) as portfolio_id,
           coalesce(l.n, 0) as likes,
           coalesce(e.v, 0) as views,
           coalesce(e.c, 0) as visits
    from l full outer join e on e.portfolio_id = l.portfolio_id
  )
  select m.portfolio_id, m.likes, m.views, m.visits
  from m
  order by case when p_metric = 'views' then m.views else m.likes end desc,
           case when p_metric = 'views' then m.likes else m.views end desc,
           m.visits desc,
           m.portfolio_id
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- ── server-only writes ─────────────────────────────────────────────────────

-- Set (p_liked = true) or clear a like. A per-IP daily cap limits ballot
-- stuffing; ip_hash already rotates daily, so all its rows are from today.
create or replace function public.record_reaction(
  p_portfolio_id text,
  p_visitor_hash text,
  p_ip_hash text,
  p_liked boolean,
  p_daily_cap integer
)
returns table (liked boolean, likes bigint, capped boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capped boolean := false;
begin
  if p_liked then
    if exists (select 1 from portfolio_reactions pr where pr.portfolio_id = p_portfolio_id and pr.visitor_hash = p_visitor_hash) then
      null; -- already liked: idempotent
    elsif (select count(*) from portfolio_reactions pr where pr.ip_hash = p_ip_hash) >= p_daily_cap then
      v_capped := true;
    else
      insert into portfolio_reactions (portfolio_id, visitor_hash, ip_hash)
      values (p_portfolio_id, p_visitor_hash, p_ip_hash)
      on conflict on constraint portfolio_reactions_pkey do nothing;
    end if;
  else
    delete from portfolio_reactions pr where pr.portfolio_id = p_portfolio_id and pr.visitor_hash = p_visitor_hash;
  end if;

  return query
    select exists (select 1 from portfolio_reactions pr where pr.portfolio_id = p_portfolio_id and pr.visitor_hash = p_visitor_hash),
           (select count(*) from portfolio_reactions pr where pr.portfolio_id = p_portfolio_id),
           v_capped;
end;
$$;

-- Record a view or site visit; returns true when counted (new for today).
create or replace function public.record_event(
  p_portfolio_id text,
  p_kind text,
  p_visitor_hash text,
  p_ip_hash text,
  p_daily_cap integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
begin
  if p_kind not in ('view', 'visit') then
    return false;
  end if;
  if (select count(*) from portfolio_events pe where pe.ip_hash = p_ip_hash and pe.day = v_day) >= p_daily_cap then
    return false;
  end if;
  insert into portfolio_events (portfolio_id, kind, visitor_hash, ip_hash, day)
  values (p_portfolio_id, p_kind, p_visitor_hash, p_ip_hash, v_day)
  on conflict (portfolio_id, kind, visitor_hash, day) do nothing;
  return found;
end;
$$;

-- ── function privileges ────────────────────────────────────────────────────
revoke all on function public.engagement_counts(text[]) from public;
revoke all on function public.engagement_leaderboard(timestamptz, timestamptz, text, integer) from public;
revoke all on function public.record_reaction(text, text, text, boolean, integer) from public, anon, authenticated;
revoke all on function public.record_event(text, text, text, text, integer) from public, anon, authenticated;

grant execute on function public.engagement_counts(text[]) to anon, authenticated, service_role;
grant execute on function public.engagement_leaderboard(timestamptz, timestamptz, text, integer) to anon, authenticated, service_role;
grant execute on function public.record_reaction(text, text, text, boolean, integer) to service_role;
grant execute on function public.record_event(text, text, text, text, integer) to service_role;
