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

export type PreviewRow = {
  id: string;
  portfolio_id: string;
  image_url: string | null;
  provider: string | null;
  status: "pending" | "ready" | "unavailable";
  captured_at: string | null;
  source_url_hash: string;
  error_code: string | null;
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
      portfolio_previews: Table<PreviewRow, "portfolio_id" | "source_url_hash">;
      sync_runs: Table<SyncRunRow, "started_at">;
      portfolio_count_snapshots: Table<SnapshotRow, "recorded_at" | "total_portfolios">;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
