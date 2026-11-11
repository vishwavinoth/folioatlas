/**
 * FolioAtlas — API response builders (server only).
 *
 * Shared by the API route handlers and by the page renderer, which embeds
 * the same payloads for server-side rendering — so the HTML crawlers see and
 * the JSON the browser would fetch are always identical.
 */
import {
  getCollections,
  getFeatured,
  getGrowthSeries,
  getPlatformStats,
  getPortfolioBySlug,
  getRecentlyAdded,
  getRelatedPortfolios,
  getRelatedTechnologies,
  listTechnologies,
  loadCatalog,
  searchPortfolios,
  type Collection,
  type GrowthSeries,
  type PlatformStats,
  type SearchParamsInput,
  type SearchResult,
  type TechnologyMeta,
  type WirePortfolio,
} from "./queries";
import type { GrowthRange } from "./catalog";
import { engagementEnabled, getRanking } from "@/lib/engagement/server";
import {
  formatDay,
  hasNext,
  hasPrevious,
  periodLabel,
  periodRange,
  periodStrip,
  periodWindow,
  shiftAnchor,
  type Metric,
  type Period,
  type StripItem,
} from "@/lib/engagement/period";

export type LeaderboardItem = { rank: number; likes: number; views: number; visits: number; portfolio: WirePortfolio };

export type LeaderboardResponse = {
  period: Period;
  metric: Metric;
  date: string;
  label: string;
  range: string;
  prev: string | null;
  next: string | null;
  strip: StripItem[];
  items: LeaderboardItem[];
};

export type StatsPayload = {
  stats: PlatformStats;
  recentlyAdded: WirePortfolio[];
  featured: WirePortfolio[];
  collections: Collection[];
  technologies: TechnologyMeta[];
  /** Most liked this week (empty until there is activity, or when disabled). */
  trending: LeaderboardItem[];
};

export async function leaderboardPayload(
  period: Period,
  anchor: Date,
  metric: Metric,
  limit = 50,
  now: Date = new Date()
): Promise<LeaderboardResponse> {
  const { from, to } = periodWindow(period, anchor);
  const [rows, { byId }] = await Promise.all([getRanking(from, to, metric, limit), loadCatalog()]);
  const items: LeaderboardItem[] = [];
  for (const row of rows) {
    const entry = byId.get(row.portfolioId);
    if (!entry) continue; // removed upstream since the activity was recorded
    items.push({ rank: items.length + 1, likes: row.likes, views: row.views, visits: row.visits, portfolio: entry.wire });
  }
  return {
    period,
    metric,
    date: formatDay(anchor),
    label: periodLabel(period, anchor, now),
    range: periodRange(period, anchor),
    prev: hasPrevious(period, anchor) ? formatDay(shiftAnchor(period, anchor, -1)) : null,
    next: hasNext(period, anchor, now) ? formatDay(shiftAnchor(period, anchor, 1)) : null,
    strip: periodStrip(period, anchor, now),
    items,
  };
}

/** Best-effort: engagement must never break the home page. */
async function trendingThisWeek(): Promise<LeaderboardItem[]> {
  if (!engagementEnabled()) return [];
  try {
    const board = await leaderboardPayload("weekly", new Date(), "likes", 8);
    return board.items.filter((i) => i.likes > 0).slice(0, 4);
  } catch (err) {
    console.error("[payloads] trending unavailable:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function statsPayload(): Promise<StatsPayload> {
  const [stats, recentlyAdded, featured, collections, technologies, trending] = await Promise.all([
    getPlatformStats(),
    getRecentlyAdded(8),
    getFeatured(4),
    getCollections(),
    listTechnologies(),
    trendingThisWeek(),
  ]);
  return { stats, recentlyAdded, featured, collections, technologies: technologies.slice(0, 14), trending };
}

export async function detailPayload(slug: string): Promise<{ portfolio: WirePortfolio; related: WirePortfolio[] } | null> {
  const portfolio = await getPortfolioBySlug(slug);
  if (!portfolio) return null;
  return { portfolio, related: await getRelatedPortfolios(portfolio, 4) };
}

export async function technologiesPayload(): Promise<{ technologies: TechnologyMeta[] }> {
  return { technologies: await listTechnologies() };
}

export async function technologyPayload(slug: string): Promise<{ technology: TechnologyMeta; related: TechnologyMeta[] } | null> {
  const technology = (await listTechnologies()).find((t) => t.slug === slug);
  if (!technology) return null;
  return { technology, related: await getRelatedTechnologies(slug, 8) };
}

export async function searchPayload(params: SearchParamsInput): Promise<SearchResult> {
  return searchPortfolios(params);
}

export async function growthPayload(range: GrowthRange): Promise<GrowthSeries> {
  return getGrowthSeries(range);
}
