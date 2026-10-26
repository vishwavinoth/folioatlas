/**
 * FolioAtlas — client-side API contracts (mirrors the server wire types).
 */
import type { AiSummaryWire, SearchResult, WirePortfolio } from "@/lib/store/queries";
import type { PlatformStats } from "@/lib/store/queries";
import type { Collection, GrowthSeries, TechnologyMeta } from "@/lib/store/queries";

export type {
  AiSummaryWire,
  SearchResult,
  WirePortfolio,
  PlatformStats,
  Collection,
  GrowthSeries,
  TechnologyMeta,
};

export type AiSearchMatchReason = { technologies: string[]; keywords: string[] };

export type AiSearchResultItem = WirePortfolio & { matchReason?: AiSearchMatchReason };

export type AiSearchResponse = {
  mode: "ai";
  query: string;
  interpretation: string;
  confidence: number;
  intent: { technologies: string[]; keywords: string[]; exclusions: string[] };
  model: string;
  results: {
    items: AiSearchResultItem[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type StatsResponse = {
  stats: PlatformStats;
  recentlyAdded: WirePortfolio[];
  featured: WirePortfolio[];
  collections: Collection[];
  technologies: TechnologyMeta[];
};

export type DetailResponse = {
  portfolio: WirePortfolio;
  related: WirePortfolio[];
};
