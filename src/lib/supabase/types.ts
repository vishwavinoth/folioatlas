/**
 * FolioAtlas — Supabase table types (mirrors supabase/migrations/*.sql).
 * Hand-maintained in the `supabase gen types typescript` shape; regenerate
 * with the CLI if the schema grows.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type PortfolioRow = {
  id: string;
  slug: string;
  name: string;
  github_username: string | null;
  github_profile_url: string | null;
  github_source: "none" | "inferred-domain";
  portfolio_url: string;
  avatar_url: string | null;
  role: string | null;
  description: string | null;
  technologies: string[];
  letter: string;
  source_section: string;
  source_repository: string;
  source_line: number | null;
  source_entry_hash: string;
  first_seen_at: string;
  last_seen_at: string;
  source_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AiSummaryRow = {
  id: string;
  portfolio_id: string;
  summary: string;
  key_technologies: string[];
  specialties: string[];
  source_hash: string;
  model: string;
  status: "pending" | "complete" | "failed";
  generated_at: string | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
};

export type SyncRunRow = {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: "running" | "success" | "failed";
  trigger: "manual" | "seed" | "cron" | "github-action";
  source_commit_sha: string | null;
  source_entry_count: number | null;
  inserted_count: number | null;
  updated_count: number | null;
  removed_or_missing_count: number | null;
  error_summary: string | null;
};

export type SnapshotRow = {
  id: string;
  sync_run_id: string | null;
  recorded_at: string;
  total_portfolios: number;
  portfolios_added: number;
  portfolios_updated: number;
  provenance: "git-history" | "sync-run";
  source_commit_sha: string | null;
};

export type ReactionRow = {
  portfolio_id: string;
  visitor_hash: string;
  ip_hash: string;
  created_at: string;
};

export type EventRow = {
  id: number;
  portfolio_id: string;
  kind: "view" | "visit";
  visitor_hash: string;
  ip_hash: string;
  day: string;
  created_at: string;
};

/** Aggregate row returned by the engagement_* functions. */
export type EngagementCountRow = { portfolio_id: string; likes: number; views: number; visits: number };

export type Database = {
  public: {
    Tables: {
      portfolios: Table<
        PortfolioRow,
        | "id"
        | "slug"
        | "name"
        | "portfolio_url"
        | "letter"
        | "source_repository"
        | "source_entry_hash"
        | "first_seen_at"
        | "last_seen_at"
      >;
      portfolio_ai_summaries: Table<AiSummaryRow, "portfolio_id" | "source_hash">;
      sync_runs: Table<SyncRunRow, "started_at">;
      portfolio_count_snapshots: Table<SnapshotRow, "recorded_at" | "total_portfolios">;
      portfolio_reactions: Table<ReactionRow, "portfolio_id" | "visitor_hash" | "ip_hash">;
      portfolio_events: Table<EventRow, "portfolio_id" | "kind" | "visitor_hash" | "ip_hash" | "day">;
    };
    Views: Record<never, never>;
    Functions: {
      engagement_counts: { Args: { p_ids: string[] }; Returns: EngagementCountRow[] };
      engagement_leaderboard: {
        Args: { p_from: string; p_to: string; p_metric?: string; p_limit?: number };
        Returns: EngagementCountRow[];
      };
      record_reaction: {
        Args: { p_portfolio_id: string; p_visitor_hash: string; p_ip_hash: string; p_liked: boolean; p_daily_cap: number };
        Returns: { liked: boolean; likes: number; capped: boolean }[];
      };
      record_event: {
        Args: { p_portfolio_id: string; p_kind: string; p_visitor_hash: string; p_ip_hash: string; p_daily_cap: number };
        Returns: boolean;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
