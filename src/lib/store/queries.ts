/**
 * FolioAtlas — server-only data access layer over Supabase.
 *
 * The directory catalog and growth history are loaded once per server
 * instance and cached for CACHE_TTL_MS (data only changes when the sync job
 * runs). All query semantics live in the pure catalog module.
 */
import { dbReader, fetchAllRows } from "@/lib/supabase/server";
import type { AiSummaryRow, PortfolioRow, SyncRunRow } from "@/lib/supabase/types";
import {
  buildCatalog,
  collectionCounts,
  featuredPortfolios,
  growthSeries,
  recentlyAdded,
  relatedPortfolios,
  relatedTechnologies,
  searchCatalog,
  technologyCounts,
  type CatalogEntry,
  type Collection,
  type GrowthRange,
  type GrowthSeries,
  type GrowthSnapshot,
  type SearchParamsInput,
  type SearchResult,
  type TechnologyMeta,
  type WirePortfolio,
} from "./catalog";

export type {
  AiSummaryWire,
  Collection,
  GrowthPoint,
  GrowthSeries,
  SearchParamsInput,
  SearchResult,
  TechnologyMeta,
  WirePortfolio,
} from "./catalog";

const CACHE_TTL_MS = 5 * 60_000;

type Catalog = { entries: CatalogEntry[]; bySlug: Map<string, CatalogEntry> };
type History = { snapshots: GrowthSnapshot[]; lastSyncRun: SyncRunRow | null };

/** TTL cache that shares one in-flight load and never caches failures. */
function ttlCache<T>(load: () => Promise<T>) {
  let entry: { at: number; value: Promise<T> } | null = null;
  return {
    get(): Promise<T> {
      if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.value;
      const value = load();
      entry = { at: Date.now(), value };
      value.catch(() => {
        if (entry?.value === value) entry = null;
      });
      return value;
    },
    invalidate() {
      entry = null;
    },
  };
}

const catalogCache = ttlCache<Catalog>(async () => {
  const db = dbReader();
  const [rows, summaries] = await Promise.all([
    fetchAllRows<PortfolioRow>((from, to) => db.from("portfolios").select("*").order("id").range(from, to)),
    fetchAllRows<AiSummaryRow>((from, to) =>
      db.from("portfolio_ai_summaries").select("*").eq("status", "complete").order("id").range(from, to)
    ),
  ]);
  const entries = buildCatalog(rows, summaries);
  return { entries, bySlug: new Map(entries.map((e) => [e.wire.slug, e])) };
});

const historyCache = ttlCache<History>(async () => {
  const db = dbReader();
  const [snapshots, lastRun] = await Promise.all([
    fetchAllRows<GrowthSnapshot>((from, to) =>
      db
        .from("portfolio_count_snapshots")
        .select("recorded_at, total_portfolios, portfolios_added, provenance")
        .order("recorded_at")
        .order("id")
        .range(from, to)
    ),
    db
      .from("sync_runs")
      .select("*")
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (lastRun.error) throw new Error(`supabase query failed: ${lastRun.error.message}`);
  return { snapshots, lastSyncRun: lastRun.data };
});

export const loadCatalog = () => catalogCache.get();

/** Drop the cached catalog so the next read reflects a fresh write. */
export function invalidateCatalog(): void {
  catalogCache.invalidate();
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function searchPortfolios(params: SearchParamsInput): Promise<SearchResult> {
  return searchCatalog((await loadCatalog()).entries, params);
}

export async function getPortfolioBySlug(slug: string): Promise<WirePortfolio | null> {
  return (await loadCatalog()).bySlug.get(slug)?.wire ?? null;
}

/** Source hash of the entry's upstream content (grounding key for AI summaries). */
export async function getSourceEntryHash(slug: string): Promise<string | null> {
  return (await loadCatalog()).bySlug.get(slug)?.sourceEntryHash ?? null;
}

export async function getRelatedPortfolios(portfolio: WirePortfolio, limit = 4): Promise<WirePortfolio[]> {
  return relatedPortfolios((await loadCatalog()).entries, portfolio, limit);
}

export async function listTechnologies(): Promise<TechnologyMeta[]> {
  return technologyCounts((await loadCatalog()).entries);
}

export async function getRelatedTechnologies(slug: string, limit = 6): Promise<TechnologyMeta[]> {
  return relatedTechnologies((await loadCatalog()).entries, slug, limit);
}

export async function getRecentlyAdded(limit: number): Promise<WirePortfolio[]> {
  return recentlyAdded((await loadCatalog()).entries, limit);
}

export async function getFeatured(limit: number): Promise<WirePortfolio[]> {
  return featuredPortfolios((await loadCatalog()).entries, limit);
}

export async function getCollections(): Promise<Collection[]> {
  return collectionCounts((await loadCatalog()).entries);
}

export async function getGrowthSeries(range: GrowthRange): Promise<GrowthSeries> {
  return growthSeries((await historyCache.get()).snapshots, range);
}

export type PlatformStats = {
  totalPortfolios: number;
  technologyCount: number;
  withRoleText: number;
  githubInferredCount: number;
  aiSummaryCount: number;
  firstEntryAt: string | null;
  lastSyncAt: string | null;
  lastSyncCommit: string | null;
  historyFrom: string | null;
  historyTo: string | null;
  historySnapshotCount: number;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  const [{ entries }, { snapshots, lastSyncRun }] = await Promise.all([loadCatalog(), historyCache.get()]);
  const firstSeen = entries.reduce((min, e) => Math.min(min, e.firstSeenMs), Infinity);
  const iso = (value: string | null | undefined) => (value ? new Date(value).toISOString() : null);
  return {
    totalPortfolios: entries.length,
    technologyCount: technologyCounts(entries).length,
    withRoleText: entries.filter((e) => e.wire.role !== null).length,
    githubInferredCount: entries.filter((e) => e.wire.githubSource === "inferred-domain").length,
    aiSummaryCount: entries.filter((e) => e.wire.hasAiSummary).length,
    firstEntryAt: Number.isFinite(firstSeen) ? new Date(firstSeen).toISOString() : null,
    lastSyncAt: iso(lastSyncRun?.completed_at ?? lastSyncRun?.started_at),
    lastSyncCommit: lastSyncRun?.source_commit_sha ?? null,
    historyFrom: iso(snapshots[0]?.recorded_at),
    historyTo: iso(snapshots[snapshots.length - 1]?.recorded_at),
    historySnapshotCount: snapshots.length,
  };
}
