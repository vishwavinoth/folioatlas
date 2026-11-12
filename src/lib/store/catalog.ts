/**
 * FolioAtlas — pure directory query logic over the in-memory catalog.
 *
 * The directory is small (~2k rows) and changes only when the sync job runs,
 * so the server loads it once per instance (see queries.ts) and answers every
 * search / filter / ranking question here. Framework- and database-free so the
 * exact semantics are unit-tested.
 */
import { technologyLabel } from "@/lib/portfolio/classify";
import { COLLECTION_DEFS, collectionBySlug } from "@/lib/portfolio/collections";
import type { AiSummaryRow, PortfolioRow, SnapshotRow } from "@/lib/supabase/types";

// ── Wire types ─────────────────────────────────────────────────────────────

export type WirePortfolio = {
  id: string;
  slug: string;
  name: string;
  githubUsername: string | null;
  /** githubSource: "none" | "inferred-domain" — the UI labels inferences honestly. */
  githubSource: "none" | "inferred-domain";
  githubProfileUrl: string | null;
  portfolioUrl: string;
  avatarUrl: string | null;
  role: string | null;
  technologies: string[];
  letter: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sourceUpdatedAt: string | null;
  hasAiSummary: boolean;
  aiSummary?: AiSummaryWire | null;
};

export type AiSummaryWire = {
  summary: string;
  keyTechnologies: string[];
  specialties: string[];
  model: string;
  generatedAt: string;
  /** The upstream entry changed after this summary was generated. */
  stale: boolean;
};

export type SearchParamsInput = {
  q: string;
  tech: string[]; // AND semantics when multiple
  /** Curated collection slug: union (OR) over its member technologies. */
  collection: string | null;
  letter: string | null;
  site: "any" | "own" | "github";
  hasSummary: boolean;
  addedWithinDays: number | null;
  sort: "name-asc" | "name-desc" | "newest" | "relevance";
  page: number;
  pageSize: number;
};

export type SearchResult<T = WirePortfolio> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type TechnologyMeta = { slug: string; label: string; count: number };
export type Collection = { slug: string; label: string; description: string; techSlugs: string[]; count: number };

/** One directory entry plus precomputed, case-folded search fields. */
export type CatalogEntry = {
  wire: WirePortfolio;
  sourceEntryHash: string;
  firstSeenMs: number;
  folded: { name: string; role: string; url: string };
};

// ── Mapping ────────────────────────────────────────────────────────────────

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function mapSummary(s: AiSummaryRow | undefined | null, sourceEntryHash?: string): AiSummaryWire | null {
  if (!s || s.status !== "complete" || !s.summary) return null;
  return {
    summary: s.summary,
    keyTechnologies: stringArray(s.key_technologies),
    specialties: stringArray(s.specialties),
    model: s.model,
    generatedAt: new Date(s.generated_at ?? s.updated_at).toISOString(),
    stale: sourceEntryHash !== undefined && s.source_hash !== sourceEntryHash,
  };
}

const byName = (a: CatalogEntry, b: CatalogEntry) =>
  a.wire.name.localeCompare(b.wire.name, "en", { sensitivity: "base" });

/** Build the catalog (sorted by name) from raw table rows. */
export function buildCatalog(rows: PortfolioRow[], summaries: AiSummaryRow[]): CatalogEntry[] {
  const summaryByPortfolio = new Map(summaries.map((s) => [s.portfolio_id, s]));
  return rows
    .map((row): CatalogEntry => {
      const summary = mapSummary(summaryByPortfolio.get(row.id), row.source_entry_hash);
      const wire: WirePortfolio = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        githubUsername: row.github_username,
        githubSource: row.github_source === "inferred-domain" ? "inferred-domain" : "none",
        githubProfileUrl: row.github_profile_url,
        portfolioUrl: row.portfolio_url,
        avatarUrl: row.avatar_url,
        role: row.role,
        technologies: stringArray(row.technologies),
        letter: row.letter,
        firstSeenAt: new Date(row.first_seen_at).toISOString(),
        lastSeenAt: new Date(row.last_seen_at).toISOString(),
        sourceUpdatedAt: row.source_updated_at ? new Date(row.source_updated_at).toISOString() : null,
        hasAiSummary: summary !== null,
        ...(summary ? { aiSummary: summary } : {}),
      };
      return {
        wire,
        sourceEntryHash: row.source_entry_hash,
        firstSeenMs: Date.parse(row.first_seen_at),
        folded: {
          name: row.name.toLowerCase(),
          role: (row.role ?? "").toLowerCase(),
          url: row.portfolio_url.toLowerCase(),
        },
      };
    })
    .sort(byName);
}

// ── Search ─────────────────────────────────────────────────────────────────

const GITHUB_HOST_PREFIXES = ["https://github.com/", "http://github.com/", "https://www.github.com/"];
const MAX_QUERY_TOKENS = 8;

const hasTech = (e: CatalogEntry, slug: string) => e.wire.technologies.includes(slug);

/** A token hits when it appears in name, role or URL, or equals a technology slug. */
function tokenHits(e: CatalogEntry, token: string): boolean {
  return (
    e.folded.name.includes(token) || e.folded.role.includes(token) || e.folded.url.includes(token) || hasTech(e, token)
  );
}

export function queryTokens(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, MAX_QUERY_TOKENS);
}

export function matchesFilters(e: CatalogEntry, params: SearchParamsInput, nowMs: number): boolean {
  if (params.letter && e.wire.letter !== params.letter.toUpperCase()) return false;
  if (!params.tech.every((slug) => hasTech(e, slug))) return false;

  if (params.collection) {
    const def = collectionBySlug(params.collection);
    if (def && def.techSlugs.length > 0 && !def.techSlugs.some((slug) => hasTech(e, slug))) return false;
  }

  if (params.site !== "any") {
    const onGithub = GITHUB_HOST_PREFIXES.some((prefix) => e.wire.portfolioUrl.startsWith(prefix));
    if (params.site === "github" ? !onGithub : onGithub) return false;
  }

  if (params.hasSummary && !e.wire.hasAiSummary) return false;

  if (params.addedWithinDays !== null && e.firstSeenMs < nowMs - params.addedWithinDays * 86_400_000) return false;

  const tokens = queryTokens(params.q.trim());
  return tokens.every((token) => tokenHits(e, token));
}

/** Transparent relevance: name hits weigh most, then role text, then techs. */
export function relevanceScore(p: WirePortfolio, rawQuery: string): number {
  const q = rawQuery.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);
  const name = p.name.toLowerCase();
  const role = (p.role ?? "").toLowerCase();
  let score = 0;
  if (name === q) score += 120;
  if (name.startsWith(q)) score += 60;
  if (name.includes(q)) score += 40;
  if (role.includes(q)) score += 20;
  if (p.portfolioUrl.toLowerCase().includes(q)) score += 15;
  for (const slug of p.technologies) {
    if (slug.includes(q)) score += 25;
  }
  for (const token of tokens) {
    if (token === q) continue;
    if (name.includes(token)) score += 12;
    if (role.includes(token)) score += 6;
    if (p.technologies.some((t) => t.includes(token))) score += 8;
  }
  return score;
}

export function paginate<T>(items: T[], page: number, pageSize: number): SearchResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    pageSize,
    total,
    totalPages,
  };
}

export function searchCatalog(
  entries: CatalogEntry[],
  params: SearchParamsInput,
  nowMs = Date.now()
): SearchResult {
  const q = params.q.trim();
  let matched = entries.filter((e) => matchesFilters(e, params, nowMs));

  if (params.sort === "relevance" && q) {
    matched = matched
      .map((e) => ({ e, score: relevanceScore(e.wire, q) }))
      .sort((a, b) => b.score - a.score || byName(a.e, b.e))
      .map((s) => s.e);
  } else if (params.sort === "newest") {
    matched = [...matched].sort((a, b) => b.firstSeenMs - a.firstSeenMs || byName(a, b));
  } else if (params.sort === "name-desc") {
    matched = [...matched].reverse();
  }
  // name-asc (and relevance without a query) keep the catalog's name order.

  return paginate(
    matched.map((e) => e.wire),
    params.page,
    params.pageSize
  );
}

// ── AI intent search ───────────────────────────────────────────────────────

export type IntentPlan = { technologies: string[]; keywords: string[]; exclusions: string[] };
export type IntentMatch = {
  portfolio: WirePortfolio;
  matchedTechnologies: string[];
  matchedKeywords: string[];
  relevanceScore: number;
  /** Matches every technology and keyword of the intent. */
  complete: boolean;
};

/**
 * Execute a validated AI intent. Exclusions are hard filters; technologies
 * and keywords rank instead of filter, so a detailed request still returns
 * its closest real matches. Entries matching every technology and keyword
 * (`complete`) always rank first. Ranked transparently.
 */
export function intentSearch(entries: CatalogEntry[], plan: IntentPlan): IntentMatch[] {
  const keywordTokens = plan.keywords
    .map((kw) => ({ kw, tokens: kw.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 4) }))
    .filter((k) => k.tokens.length > 0);
  const exclusions = plan.exclusions.map((x) => x.toLowerCase());
  const criteria = plan.technologies.length + keywordTokens.length;

  return entries
    .filter((e) => !exclusions.some((x) => e.folded.name.includes(x) || e.folded.role.includes(x)))
    .map((e) => {
      const techHits = plan.technologies.filter((slug) => hasTech(e, slug));
      const keywordHits = keywordTokens.filter((k) => k.tokens.some((t) => tokenHits(e, t))).map((k) => k.kw);
      const hits = techHits.length + keywordHits.length;
      const complete = criteria > 0 && hits === criteria;
      return { e, techHits, keywordHits, complete, score: (complete ? 1000 : 0) + techHits.length * 30 + keywordHits.length * 12 };
    })
    .filter((s) => s.techHits.length + s.keywordHits.length > 0)
    .sort((a, b) => b.score - a.score || byName(a.e, b.e))
    .map((s) => ({
      portfolio: s.e.wire,
      matchedTechnologies: s.techHits,
      matchedKeywords: s.keywordHits,
      relevanceScore: s.score,
      complete: s.complete,
    }));
}

// ── Detail + related ───────────────────────────────────────────────────────

/** Rank by shared-technology overlap, then name; pad with alphabetical filler. */
export function relatedPortfolios(entries: CatalogEntry[], portfolio: WirePortfolio, limit = 4): WirePortfolio[] {
  const others = entries.filter((e) => e.wire.slug !== portfolio.slug);
  if (portfolio.technologies.length === 0) {
    return others.filter((e) => e.wire.letter === portfolio.letter).slice(0, limit).map((e) => e.wire);
  }
  const ranked = others
    .map((e) => ({ e, overlap: e.wire.technologies.filter((t) => portfolio.technologies.includes(t)).length }))
    .filter((r) => r.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || byName(a.e, b.e))
    .slice(0, limit)
    .map((r) => r.e.wire);
  if (ranked.length < limit) {
    const taken = new Set(ranked.map((p) => p.slug));
    ranked.push(...others.filter((e) => !taken.has(e.wire.slug)).slice(0, limit - ranked.length).map((e) => e.wire));
  }
  return ranked;
}

// ── Discovery ──────────────────────────────────────────────────────────────

export function technologyCounts(entries: CatalogEntry[]): TechnologyMeta[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    for (const slug of e.wire.technologies) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, label: technologyLabel(slug), count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

/** Co-occurrence based related technologies for landing pages. */
export function relatedTechnologies(entries: CatalogEntry[], slug: string, limit = 6): TechnologyMeta[] {
  return technologyCounts(entries.filter((e) => hasTech(e, slug)))
    .filter((t) => t.slug !== slug)
    .slice(0, limit);
}

/** Curated collections — counts are real unions over indexed rows. */
export function collectionCounts(entries: CatalogEntry[]): Collection[] {
  return COLLECTION_DEFS.map((def) => ({
    ...def,
    count: entries.filter((e) => def.techSlugs.some((t) => hasTech(e, t))).length,
  }));
}

export function recentlyAdded(entries: CatalogEntry[], limit: number): WirePortfolio[] {
  return [...entries]
    .sort((a, b) => b.firstSeenMs - a.firstSeenMs || byName(a, b))
    .slice(0, limit)
    .map((e) => e.wire);
}

/**
 * Featured developers — transparent, deterministic criteria:
 * entries with supplied role text AND ≥2 focus areas AND a github.io
 * portfolio (verifiable authorship), ranked by completeness then name.
 */
export function featuredPortfolios(entries: CatalogEntry[], limit: number): WirePortfolio[] {
  return entries
    .filter(
      (e) =>
        e.wire.role !== null &&
        e.wire.githubSource === "inferred-domain" &&
        e.wire.portfolioUrl.includes(".github.io") &&
        e.wire.technologies.length >= 2
    )
    .map((e) => ({ e, score: e.wire.technologies.length * 10 + (e.wire.role ? 5 : 0) }))
    .sort((a, b) => b.score - a.score || byName(a.e, b.e))
    .slice(0, limit)
    .map((s) => s.e.wire);
}

// ── Growth ─────────────────────────────────────────────────────────────────

export type GrowthRange = "30d" | "90d" | "1y" | "all";
export type GrowthSnapshot = Pick<SnapshotRow, "recorded_at" | "total_portfolios" | "portfolios_added" | "provenance">;
export type GrowthPoint = { date: string; total: number; added: number; provenance: string };
export type GrowthSeries = {
  range: GrowthRange;
  points: GrowthPoint[];
  coverageFrom: string | null;
  coverageTo: string | null;
  totalSnapshotsInRange: number;
  downsampled: boolean;
};

const RANGE_DAYS: Record<GrowthRange, number | null> = { "30d": 30, "90d": 90, "1y": 365, all: null };

/**
 * Downscale verified snapshots (ascending by recorded_at) into chart points.
 * Buckets: 30d/90d → per day, 1y → per week, all → per month.
 * "added" per bucket = sum of per-commit adds (exact: an entry is new once).
 */
export function growthSeries(snapshots: GrowthSnapshot[], range: GrowthRange, nowMs = Date.now()): GrowthSeries {
  const days = RANGE_DAYS[range];
  const since = days === null ? -Infinity : nowMs - days * 86_400_000;
  const inRange = snapshots.filter((s) => Date.parse(s.recorded_at) >= since);

  const bucketMs = days !== null && days <= 90 ? 86_400_000 : range === "1y" ? 7 * 86_400_000 : 30 * 86_400_000;
  const points: GrowthPoint[] = [];
  for (const s of inRange) {
    const t = Date.parse(s.recorded_at);
    const last = points[points.length - 1];
    if (last && t - Date.parse(last.date) < bucketMs) {
      // Same bucket: keep the later cumulative total, accumulate adds.
      last.total = s.total_portfolios;
      last.added += s.portfolios_added;
    } else {
      points.push({
        date: new Date(t).toISOString(),
        total: s.total_portfolios,
        added: s.portfolios_added,
        provenance: s.provenance,
      });
    }
  }

  return {
    range,
    points,
    coverageFrom: inRange[0] ? new Date(inRange[0].recorded_at).toISOString() : null,
    coverageTo: inRange.length ? new Date(inRange[inRange.length - 1].recorded_at).toISOString() : null,
    totalSnapshotsInRange: inRange.length,
    downsampled: points.length < inRange.length,
  };
}
