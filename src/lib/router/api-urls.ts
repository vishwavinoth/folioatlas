/**
 * FolioAtlas — API request URLs derived from a route (pure, shared).
 *
 * Used by the client views to fetch data AND by the server page to
 * pre-render the same requests, so both sides must agree byte for byte.
 */
import { collectionBySlug } from "@/lib/portfolio/collections";
import { parseMetric, parsePeriod } from "@/lib/engagement/period";

export type RouteLike = { path: string; query: URLSearchParams };

export const SEARCH_SORTS = ["relevance", "newest", "name-asc", "name-desc"] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

/** Keyword-search request for directory-style routes (portfolios, letters, technologies, collections). */
export function searchApiUrl(route: RouteLike): string {
  const techSlugFromPath = route.path.startsWith("/technologies/") ? route.path.split("/")[2] || null : null;
  const collectionSlug = route.path.startsWith("/collections/") ? route.path.split("/")[2] || null : null;
  const collectionDef = collectionSlug ? collectionBySlug(collectionSlug) : null;
  const letterFromPath = route.path.startsWith("/portfolios/letter/") ? (route.path.split("/")[3]?.toUpperCase() ?? null) : null;
  const letterQuery = route.query.get("letter");
  const letter = letterFromPath ?? (letterQuery && /^[a-z]$/i.test(letterQuery) ? letterQuery.toUpperCase() : null);

  const urlQ = route.query.get("q") ?? "";
  const urlTech = (route.query.get("tech") ?? "").split(",").filter(Boolean);
  const siteParam = route.query.get("site");
  const site = siteParam === "own" || siteParam === "github" ? siteParam : "any";
  const hasSummary = route.query.get("hasSummary") === "true";
  const addedWithin = route.query.get("addedWithin");
  const sortParam = route.query.get("sort");
  const sort: SearchSort = SEARCH_SORTS.includes(sortParam as SearchSort) ? (sortParam as SearchSort) : "name-asc";
  const page = Math.max(1, Number(route.query.get("page") ?? "1") || 1);
  const techs = techSlugFromPath ? [techSlugFromPath] : urlTech;

  const params = new URLSearchParams();
  if (urlQ) params.set("q", urlQ);
  if (techs.length) params.set("tech", techs.join(","));
  if (collectionDef) params.set("collection", collectionDef.slug);
  if (letter) params.set("letter", letter);
  if (site !== "any") params.set("site", site);
  if (hasSummary) params.set("hasSummary", "true");
  if (addedWithin) params.set("addedWithin", addedWithin);
  params.set("sort", sort);
  params.set("page", String(page));
  return `/api/search?${params.toString()}`;
}

export function leaderboardApiUrl(route: RouteLike): string {
  const params = new URLSearchParams();
  params.set("period", parsePeriod(route.query.get("period")));
  params.set("metric", parseMetric(route.query.get("metric")));
  const date = route.query.get("date");
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) params.set("date", date);
  return `/api/leaderboard?${params.toString()}`;
}

export const technologyApiUrl = (slug: string) => `/api/technologies?slug=${encodeURIComponent(slug)}`;
export const detailApiUrl = (slug: string) => `/api/portfolios/${slug}`;
export const DEFAULT_GROWTH_RANGE = "1y";
export const growthApiUrl = (range: string) => `/api/growth?range=${range}`;
