/**
 * FolioAtlas — pure directory logic: search, filter, sort, paginate (PRD §9).
 * Kept framework-free so it can be unit-tested directly and reused on the
 * client for instant interactive filtering.
 */
import type { PortfolioBase as Portfolio } from "./types";

export const PAGE_SIZE = 24;
export const SORT_OPTIONS = ["name-asc", "name-desc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** Whitespace-normalized, case-folded haystack. */
function fold(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export type SearchFields = {
  name: string;
  url: string;
  host: string;
  description: string;
  technologies: string[];
};

/** Precompute folded search haystacks once (avoids per-keystroke recomputation). */
export function buildSearchFields(p: Portfolio): SearchFields {
  let host = "";
  try {
    host = new URL(p.url).host.replace(/^www\./, "");
  } catch {
    host = "";
  }
  return {
    name: fold(p.name),
    url: fold(p.url),
    host: fold(host),
    description: p.description ? fold(p.description) : "",
    technologies: p.technologies ?? [],
  };
}

/** Case-insensitive, whitespace-normalized multi-field match. */
export function matchesQuery(fields: SearchFields, rawQuery: string): boolean {
  const q = fold(rawQuery);
  if (!q) return true;
  if (fields.name.includes(q)) return true;
  if (fields.url.includes(q)) return true;
  if (fields.host.includes(q)) return true;
  if (fields.description && fields.description.includes(q)) return true;
  for (const slug of fields.technologies) {
    if (slug.includes(q)) return true;
  }
  // Multi-token queries: every token must hit somewhere.
  const tokens = q.split(" ").filter(Boolean);
  if (tokens.length > 1) {
    const haystack = `${fields.name} ${fields.url} ${fields.host} ${fields.description} ${fields.technologies.join(" ")}`;
    return tokens.every((t) => haystack.includes(t));
  }
  return false;
}

export type DirectoryQuery = {
  q: string;
  letter: string | null; // "A"…"Z"
  technology: string | null; // slug
  sort: SortOption;
  page: number; // 1-based
};

export const DEFAULT_QUERY: DirectoryQuery = { q: "", letter: null, technology: null, sort: "name-asc", page: 1 };

export function filterPortfolios(
  portfolios: Portfolio[],
  fieldsById: Map<string, SearchFields>,
  query: Pick<DirectoryQuery, "q" | "letter" | "technology">
): Portfolio[] {
  const q = query.q.trim();
  const letter = query.letter?.toUpperCase() ?? null;
  return portfolios.filter((p) => {
    if (letter && p.letter !== letter) return false;
    if (query.technology && !(p.technologies ?? []).includes(query.technology)) return false;
    if (q && !matchesQuery(fieldsById.get(p.id) ?? buildSearchFields(p), q)) return false;
    return true;
  });
}

export function sortPortfolios(portfolios: Portfolio[], sort: SortOption): Portfolio[] {
  const dir = sort === "name-desc" ? -1 : 1;
  return [...portfolios].sort(
    (a, b) => dir * a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true })
  );
}

export type Page = {
  items: Portfolio[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function paginate(items: Portfolio[], page: number, pageSize = PAGE_SIZE): Page {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

/** Letter counts for the AlphabetNavigator (A–Z with ≥0 counts). */
export function letterCounts(portfolios: Portfolio[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of portfolios) counts[p.letter] = (counts[p.letter] ?? 0) + 1;
  return counts;
}

export function technologyCounts(technologies: { slug: string; count: number }[]): Map<string, number> {
  return new Map(technologies.map((t) => [t.slug, t.count]));
}
