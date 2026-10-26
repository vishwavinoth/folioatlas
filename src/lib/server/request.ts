/**
 * FolioAtlas — request parsing + validation for API routes.
 * Query parameters are untrusted: every value is validated and clamped.
 */
import type { SearchParamsInput } from "@/lib/store/catalog";
import { technologyLabel } from "@/lib/portfolio/classify";
import { collectionBySlug } from "@/lib/portfolio/collections";

export const PAGE_SIZES = [12, 24, 48] as const;
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;

const SORTS = new Set(["name-asc", "name-desc", "newest", "relevance"]);
const RANGES = new Set(["30d", "90d", "1y", "all"]);
const ADDED_WITHIN = new Set(["30", "90", "365"]);

export type ParsedSearchQuery = SearchParamsInput;

export function parseSearchQuery(searchParams: URLSearchParams): ParsedSearchQuery {
  const q = (searchParams.get("q") ?? "").slice(0, 200);
  const tech = (searchParams.get("tech") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9-]{1,40}$/.test(s))
    .slice(0, 5);
  const collectionRaw = searchParams.get("collection");
  const collection =
    collectionRaw && /^[a-z0-9-]{1,40}$/.test(collectionRaw) && collectionBySlug(collectionRaw)
      ? collectionRaw
      : null;
  const letterRaw = searchParams.get("letter");
  const letter = letterRaw && /^[a-z]$/i.test(letterRaw) ? letterRaw.toUpperCase() : null;

  const siteRaw = searchParams.get("site");
  const site = siteRaw === "own" || siteRaw === "github" ? siteRaw : "any";

  const pageSizeRaw = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);
  const pageSize = PAGE_SIZES.includes(pageSizeRaw as (typeof PAGE_SIZES)[number])
    ? pageSizeRaw
    : DEFAULT_PAGE_SIZE;

  const sortRaw = searchParams.get("sort") ?? "name-asc";

  const addedRaw = searchParams.get("addedWithin");

  return {
    q,
    tech,
    collection,
    letter,
    site,
    hasSummary: searchParams.get("hasSummary") === "true",
    addedWithinDays: addedRaw && ADDED_WITHIN.has(addedRaw) ? Number(addedRaw) : null,
    sort: SORTS.has(sortRaw) ? (sortRaw as ParsedSearchQuery["sort"]) : "name-asc",
    page: Math.max(1, Math.min(500, Number(searchParams.get("page") ?? "1") || 1)),
    pageSize: Math.min(pageSize, MAX_PAGE_SIZE),
  };
}

export type GrowthRange = "30d" | "90d" | "1y" | "all";

export function parseGrowthRange(searchParams: URLSearchParams): GrowthRange {
  const raw = searchParams.get("range");
  return raw && RANGES.has(raw) ? (raw as GrowthRange) : "all";
}

/** JSON error response with a stable machine-readable shape. */
export function jsonError(code: string, status: number, detail?: string): Response {
  return Response.json({ error: code, ...(detail ? { detail } : {}) }, { status });
}

/**
 * Log an unexpected route failure and map it to a stable error response.
 * Missing Supabase configuration is reported as 503 so it is obvious in
 * monitoring and never mistaken for a code bug.
 */
export function serverError(route: string, err: unknown, code: string): Response {
  if (err instanceof Error && err.name === "DatabaseNotConfiguredError") {
    console.error(`[${route}] ${err.message}`);
    return jsonError("database-not-configured", 503);
  }
  console.error(`[${route}] failed:`, err);
  return jsonError(code, 500);
}

/** Cache-Control for public, sync-driven data: CDN-cached, revalidated in background. */
export const PUBLIC_CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export function techLabelSafe(slug: string): string {
  return technologyLabel(slug);
}
