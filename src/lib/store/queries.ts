/**
 * FolioAtlas — server-only data access layer over the Prisma/SQLite store.
 *
 * Every function here is server-side only (imported exclusively by route
 * handlers and server components). Wire types are lean: clients never see
 * source hashes, run ids or provider internals.
 */
import { db } from "@/lib/db";
import type { Portfolio, PortfolioAiSummary } from "@prisma/client";
import { technologyLabel } from "@/lib/portfolio/classify";
import { COLLECTION_DEFS, collectionBySlug } from "@/lib/portfolio/collections";

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

export type SearchResult = {
  items: WirePortfolio[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// ── Mapping ────────────────────────────────────────────────────────────────

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function mapSummary(s: PortfolioAiSummary | null): AiSummaryWire | null {
  if (!s || s.status !== "complete" || !s.summary) return null;
  return {
    summary: s.summary,
    keyTechnologies: parseJsonArray(s.keyTechnologies),
    specialties: parseJsonArray(s.specialties),
    model: s.model,
    generatedAt: (s.generatedAt ?? s.updatedAt).toISOString(),
  };
}

/** Exported for API routes that hydrate raw Prisma rows into wire shape. */
export function mapPortfolioWire(row: Portfolio & { aiSummary: PortfolioAiSummary | null }): WirePortfolio {
  return mapPortfolio(row, row.aiSummary);
}

function mapPortfolio(row: Portfolio, summary: PortfolioAiSummary | null = null): WirePortfolio {
  const summaryWire = mapSummary(summary);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    githubUsername: row.githubUsername,
    githubSource: row.githubSource === "inferred-domain" ? "inferred-domain" : "none",
    githubProfileUrl: row.githubProfileUrl,
    portfolioUrl: row.portfolioUrl,
    avatarUrl: row.avatarUrl,
    role: row.role,
    technologies: parseJsonArray(row.technologies),
    letter: row.letter,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    sourceUpdatedAt: row.sourceUpdatedAt?.toISOString() ?? null,
    hasAiSummary: summaryWire !== null,
    ...(summaryWire ? { aiSummary: summaryWire } : {}),
  };
}

// ── Query building ─────────────────────────────────────────────────────────

const GITHUB_HOST_PREFIXES = ["https://github.com/", "http://github.com/", "https://www.github.com/"];

function buildWhere(params: SearchParamsInput) {
  const where: Record<string, unknown> = {};

  if (params.letter) where.letter = params.letter.toUpperCase();

  if (params.tech.length > 0) {
    // AND semantics: entry must carry every selected slug (exact token match
    // inside the JSON array column, e.g. '"react"' never matches '"react-native"').
    where.AND = [
      ...((where.AND as unknown[]) ?? []),
      ...params.tech.map((slug) => ({ technologies: { contains: `"${slug}"` } })),
    ];
  }

  if (params.collection) {
    const def = collectionBySlug(params.collection);
    if (def && def.techSlugs.length > 0) {
      // Union semantics: entry carries at least one of the collection's slugs.
      where.OR = def.techSlugs.map((slug) => ({ technologies: { contains: `"${slug}"` } }));
    }
  }

  if (params.site === "own") {
    where.NOT = GITHUB_HOST_PREFIXES.map((prefix) => ({ portfolioUrl: { startsWith: prefix } }));
  } else if (params.site === "github") {
    where.OR = GITHUB_HOST_PREFIXES.map((prefix) => ({ portfolioUrl: { startsWith: prefix } }));
  }

  if (params.hasSummary) {
    where.aiSummary = { is: { status: "complete", NOT: { summary: "" } } };
  }

  if (params.addedWithinDays !== null) {
    const since = new Date(Date.now() - params.addedWithinDays * 24 * 60 * 60 * 1000);
    where.firstSeenAt = { gte: since };
  }

  return where;
}

/** Fold + token search conditions: every token must hit ≥1 searchable field. */
function buildSearchConditions(q: string) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  if (tokens.length === 0) return null;
  return tokens.map((token) => ({
    OR: [
      { name: { contains: token } },
      { role: { contains: token } },
      { portfolioUrl: { contains: token } },
      { technologies: { contains: `"${token}"` } },
    ],
  }));
}

// ── Search ─────────────────────────────────────────────────────────────────

const MAX_SORT_POOL = 5000;

export async function searchPortfolios(params: SearchParamsInput): Promise<SearchResult> {
  const where = buildWhere(params);
  const searchConds = params.q.trim() ? buildSearchConditions(params.q.trim()) : null;

  if (searchConds) {
    where.AND = [...((where.AND as unknown[]) ?? []), ...searchConds];
  }

  // Relevance scoring needs content access → pool the filtered matches and
  // score in JS (directory scale: ≤ 2072 rows; hard-capped for safety).
  if (params.sort === "relevance" && params.q.trim()) {
    const rows = await db.portfolio.findMany({
      where,
      include: { aiSummary: true },
      take: MAX_SORT_POOL,
    });
    const scored = rows
      .map((row) => ({ row, score: relevanceScore(mapPortfolio(row), params.q) }))
      .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name, "en", { sensitivity: "base" }));
    return paginateScored(scored.map((s) => mapPortfolio(s.row, s.row.aiSummary)), params);
  }

  const orderBy =
    params.sort === "newest"
      ? [{ firstSeenAt: "desc" as const }, { name: "asc" as const }]
      : params.sort === "name-desc"
        ? [{ name: "desc" as const }]
        : [{ name: "asc" as const }];

  const [total, rows] = await Promise.all([
    db.portfolio.count({ where }),
    db.portfolio.findMany({
      where,
      orderBy,
      skip: (Math.max(1, params.page) - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  return {
    items: rows.map((row) => mapPortfolio(row)),
    page: Math.min(Math.max(1, params.page), totalPages),
    pageSize: params.pageSize,
    total,
    totalPages,
  };
}

function paginateScored(items: WirePortfolio[], params: SearchParamsInput): SearchResult {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(Math.max(1, params.page), totalPages);
  return {
    items: items.slice((page - 1) * params.pageSize, page * params.pageSize),
    page,
    pageSize: params.pageSize,
    total,
    totalPages,
  };
}

/** Transparent relevance: name hits weigh most, then role text, then techs. */
function relevanceScore(p: WirePortfolio, rawQuery: string): number {
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

// ── Detail + related ───────────────────────────────────────────────────────

export async function getPortfolioBySlug(slug: string): Promise<WirePortfolio | null> {
  const row = await db.portfolio.findUnique({
    where: { slug },
    include: { aiSummary: true },
  });
  return row ? mapPortfolio(row, row.aiSummary) : null;
}

export async function getRelatedPortfolios(portfolio: WirePortfolio, limit = 4): Promise<WirePortfolio[]> {
  const slugs = portfolio.technologies;
  if (slugs.length === 0) {
    const rows = await db.portfolio.findMany({
      where: { letter: portfolio.letter, slug: { not: portfolio.slug } },
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map((row) => mapPortfolio(row));
  }
  const where = {
    slug: { not: portfolio.slug },
    OR: slugs.map((slug) => ({ technologies: { contains: `"${slug}"` } })),
  };
  const rows = await db.portfolio.findMany({ where, take: limit * 3 });
  // Rank by shared-technology overlap, then name (deterministic).
  const ranked = rows
    .map((row) => {
      const techs = parseJsonArray(row.technologies);
      const overlap = techs.filter((t) => slugs.includes(t)).length;
      return { row, overlap };
    })
    .filter((r) => r.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.row.name.localeCompare(b.row.name, "en", { sensitivity: "base" }))
    .slice(0, limit);
  if (ranked.length < limit) {
    const exclude = new Set([portfolio.slug, ...ranked.map((r) => r.row.slug)]);
    const filler = await db.portfolio.findMany({
      where: { slug: { notIn: [...exclude] } },
      orderBy: { name: "asc" },
      take: limit - ranked.length,
    });
    for (const row of filler) ranked.push({ row, overlap: 0 });
  }
  return ranked.map((r) => mapPortfolio(r.row));
}

// ── Stats / growth / discovery ─────────────────────────────────────────────

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
  const [totalPortfolios, withRoleText, githubInferredCount, aiSummaryCount, firstEntry, lastSyncRun] =
    await Promise.all([
      db.portfolio.count(),
      db.portfolio.count({ where: { NOT: { role: null } } }),
      db.portfolio.count({ where: { githubSource: "inferred-domain" } }),
      db.portfolioAiSummary.count({ where: { status: "complete" } }),
      db.portfolio.findFirst({ orderBy: { firstSeenAt: "asc" }, select: { firstSeenAt: true } }),
      db.syncRun.findFirst({ where: { status: "success" }, orderBy: { startedAt: "desc" } }),
    ]);

  const [oldestSnapshot, newestSnapshot, snapCount] = await Promise.all([
    db.portfolioCountSnapshot.findFirst({ orderBy: { recordedAt: "asc" }, select: { recordedAt: true } }),
    db.portfolioCountSnapshot.findFirst({ orderBy: { recordedAt: "desc" }, select: { recordedAt: true } }),
    db.portfolioCountSnapshot.count(),
  ]);

  const technologies = await listTechnologies();
  return {
    totalPortfolios,
    technologyCount: technologies.length,
    withRoleText,
    githubInferredCount,
    aiSummaryCount,
    firstEntryAt: firstEntry?.firstSeenAt.toISOString() ?? null,
    lastSyncAt: (lastSyncRun?.completedAt ?? lastSyncRun?.startedAt ?? null)?.toISOString() ?? null,
    lastSyncCommit: lastSyncRun?.sourceCommitSha ?? null,
    historyFrom: oldestSnapshot?.recordedAt.toISOString() ?? null,
    historyTo: newestSnapshot?.recordedAt.toISOString() ?? null,
    historySnapshotCount: snapCount,
  };
}

export type GrowthPoint = { date: string; total: number; added: number; provenance: string };
export type GrowthSeries = {
  range: "30d" | "90d" | "1y" | "all";
  points: GrowthPoint[];
  coverageFrom: string | null;
  coverageTo: string | null;
  totalSnapshotsInRange: number;
  downsampled: boolean;
};

/**
 * Build a downscaled growth series from verified snapshots.
 * Buckets: 30d/90d → per day, 1y → per week, all → per month.
 * "added" per bucket = sum of per-commit adds (exact: an entry is new once).
 */
export async function getGrowthSeries(range: "30d" | "90d" | "1y" | "all"): Promise<GrowthSeries> {
  const days = range === "30d" ? 30 : range === "90d" ? 90 : range === "1y" ? 365 : null;
  const where = days !== null ? { recordedAt: { gte: new Date(Date.now() - days * 86400000) } } : {};
  const snaps = await db.portfolioCountSnapshot.findMany({
    where,
    orderBy: { recordedAt: "asc" },
    select: { recordedAt: true, totalPortfolios: true, portfoliosAdded: true, provenance: true },
  });

  const bucketMs = range === "30d" || range === "90d" ? 86400000 : range === "1y" ? 7 * 86400000 : 30 * 86400000;
  const points: GrowthPoint[] = [];
  for (const s of snaps) {
    const t = s.recordedAt.getTime();
    const last = points[points.length - 1];
    if (last && t - new Date(last.date).getTime() < bucketMs) {
      // Same bucket: keep the later cumulative total, accumulate adds.
      last.total = s.totalPortfolios;
      last.added += s.portfoliosAdded;
    } else {
      points.push({
        date: s.recordedAt.toISOString(),
        total: s.totalPortfolios,
        added: s.portfoliosAdded,
        provenance: s.provenance,
      });
    }
  }

  return {
    range,
    points,
    coverageFrom: snaps[0]?.recordedAt.toISOString() ?? null,
    coverageTo: snaps[snaps.length - 1]?.recordedAt.toISOString() ?? null,
    totalSnapshotsInRange: snaps.length,
    downsampled: points.length < snaps.length,
  };
}

export type TechnologyMeta = { slug: string; label: string; count: number };

export async function listTechnologies(): Promise<TechnologyMeta[]> {
  const rows = await db.portfolio.findMany({ select: { technologies: true } });
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const slug of parseJsonArray(row.technologies)) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, label: technologyLabel(slug), count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

export async function getRecentlyAdded(limit: number): Promise<WirePortfolio[]> {
  const rows = await db.portfolio.findMany({
    orderBy: [{ firstSeenAt: "desc" }, { name: "asc" }],
    take: limit,
  });
  return rows.map((row) => mapPortfolio(row));
}

/**
 * Featured developers — transparent, deterministic criteria:
 * entries with supplied role text AND ≥2 focus areas AND a github.io
 * portfolio (verifiable authorship), ranked by completeness then name.
 */
export async function getFeatured(limit: number): Promise<WirePortfolio[]> {
  const candidates = await db.portfolio.findMany({
    where: {
      NOT: { role: null },
      portfolioUrl: { contains: ".github.io" },
      githubSource: "inferred-domain",
    },
    take: 400,
  });
  const scored = candidates
    .map((row) => {
      const techs = parseJsonArray(row.technologies);
      return { row, techs, score: techs.length * 10 + (row.role ? 5 : 0) };
    })
    .filter((c) => c.techs.length >= 2)
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name, "en", { sensitivity: "base" }))
    .slice(0, limit);
  return scored.map((s) => mapPortfolio(s.row));
}

export type Collection = { slug: string; label: string; description: string; techSlugs: string[]; count: number };

/** Curated collections — counts are real unions over indexed rows. */
export async function getCollections(): Promise<Collection[]> {
  const rows = await db.portfolio.findMany({ select: { technologies: true } });
  const techSets = rows.map((row) => new Set(parseJsonArray(row.technologies)));
  return COLLECTION_DEFS.map((def) => {
    const count = techSets.reduce((acc, set) => acc + (def.techSlugs.some((t) => set.has(t)) ? 1 : 0), 0);
    return { ...def, count };
  });
}

/** Co-occurrence based related technologies for landing pages. */
export async function getRelatedTechnologies(slug: string, limit = 6): Promise<TechnologyMeta[]> {
  const rows = await db.portfolio.findMany({
    where: { technologies: { contains: `"${slug}"` } },
    select: { technologies: true },
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const t of parseJsonArray(row.technologies)) {
      if (t === slug) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([t, count]) => ({ slug: t, label: technologyLabel(t), count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
    .slice(0, limit);
}

export async function getLetterCounts(): Promise<Record<string, number>> {
  const grouped = await db.portfolio.groupBy({ by: ["letter"], _count: { _all: true } });
  const out: Record<string, number> = {};
  for (const g of grouped) out[g.letter] = g._count._all;
  return out;
}
