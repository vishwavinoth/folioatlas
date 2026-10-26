-- FolioAtlas — explicit Data API grants.
--
-- Newer Supabase projects no longer grant table privileges to the API roles
-- automatically. RLS (0001) still decides which rows are visible; these
-- grants only make the tables reachable through the Data API.
-- anon/authenticated: read-only. service_role: full access (server-side only).

grant usage on schema public to anon, authenticated, service_role;

grant select on
  public.portfolios,
  public.portfolio_ai_summaries,
  public.portfolio_previews,
  public.sync_runs,
  public.portfolio_count_snapshots
to anon, authenticated;

grant select, insert, update, delete on
  public.portfolios,
  public.portfolio_ai_summaries,
  public.portfolio_previews,
  public.sync_runs,
  public.portfolio_count_snapshots
to service_role;
