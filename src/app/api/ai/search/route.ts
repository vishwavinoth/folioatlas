import { db } from "@/lib/db";
import { listTechnologies, mapPortfolioWire } from "@/lib/store/queries";
import { parseSearchQuery, jsonError } from "@/lib/server/request";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import { completeJson, extractJson } from "@/lib/ai/provider";
import { buildIntentPrompt, validateIntent, planFromIntent } from "@/lib/ai/search-intent";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/search — natural-language portfolio search.
 *
 * Flow: rate limit → LLM intent (validated against canonical vocabulary) →
 * REAL database query plan → transparent results with match reasons.
 * The model never invents records; it only shapes a query that the database
 * executes. Falls back with a machine-readable error so the client can
 * switch to keyword search.
 */
export async function POST(req: Request) {
  const limit = rateLimit(`ai-search:${clientIp(req)}`, 10, 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: "rate-limited", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
    );
  }

  let body: { query?: unknown };
  try {
    body = (await req.json()) as { query?: unknown };
  } catch {
    return jsonError("invalid-json", 400);
  }
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 300) : "";
  if (!query) return jsonError("missing-query", 400);

  try {
    const technologies = await listTechnologies();
    const knownSlugs = new Set(technologies.map((t) => t.slug));
    const { system, user } = buildIntentPrompt(query, technologies.slice(0, 30));

    const llm = await completeJson({ system, user, maxTokens: 500 });
    const intent = validateIntent(extractJson(llm.raw), knownSlugs);
    const plan = planFromIntent(intent);

    // Execute the REAL query: technologies (AND) + keywords (each must hit
    // a searchable field) + exclusions (must not hit).
    const params = parseSearchQuery(new URLSearchParams({ sort: "relevance", pageSize: "24" }));
    const baseWhere = {
      ...(plan.technologies.length
        ? { AND: plan.technologies.map((slug) => ({ technologies: { contains: `"${slug}"` } })) }
        : {}),
    };
    const results = await executeIntentQuery(params, plan, baseWhere);

    return Response.json({
      mode: "ai" as const,
      query,
      interpretation: intent.interpretation,
      confidence: intent.confidence,
      intent: { technologies: plan.technologies, keywords: plan.keywords, exclusions: plan.exclusions },
      model: llm.model,
      results,
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    if (name === "LlmUnavailableError" || name === "LlmRequestError") {
      return Response.json(
        { error: "ai-unavailable", detail: "AI search is temporarily unavailable — keyword search still works." },
        { status: 503 }
      );
    }
    console.error("[api/ai/search] failed:", err);
    return jsonError("ai-search-failed", 500);
  }
}

type Plan = { technologies: string[]; keywords: string[]; exclusions: string[] };

async function executeIntentQuery(
  params: ReturnType<typeof parseSearchQuery>,
  plan: Plan,
  baseWhere: Record<string, unknown>
) {
  // Build where conditions mirroring the store layer but with intent semantics.
  const conditions: Record<string, unknown>[] = [];

  if (plan.technologies.length > 0) {
    // OR semantics across chosen technologies, then keyword constraints AND-ed.
    conditions.push({
      OR: plan.technologies.map((slug) => ({ technologies: { contains: `"${slug}"` } })),
    });
  }

  for (const keyword of plan.keywords) {
    // Token-level matching: "ai tools" matches if "ai" OR "tools" hits any
    // searchable field (recall-friendly; ranking penalizes weak matches).
    const tokens = keyword.split(/\s+/).filter(Boolean).slice(0, 4);
    if (tokens.length === 0) continue;
    conditions.push({
      OR: tokens.flatMap((token) => [
        { name: { contains: token } },
        { role: { contains: token } },
        { portfolioUrl: { contains: token } },
        { technologies: { contains: `"${token}"` } },
      ]),
    });
  }

  for (const term of plan.exclusions) {
    conditions.push({
      AND: [
        { NOT: { name: { contains: term } } },
        { NOT: { role: { contains: term } } },
      ],
    });
  }

  const where = conditions.length > 0 ? { ...baseWhere, AND: [...((baseWhere.AND as unknown[]) ?? []), ...conditions] } : baseWhere;

  const rows = await db.portfolio.findMany({ where, take: 400 });
  const matched = rankByIntent(
    rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      role: row.role,
      technologies: safeParse(row.technologies),
    })),
    plan
  );

  const total = matched.length;
  const page = params.page;
  const items = matched.slice((page - 1) * params.pageSize, page * params.pageSize);

  // Hydrate the page items through the store mapper (full wire shape) and
  // attach transparent match reasons explaining WHY each result matched.
  const hydrated = await Promise.all(
    items.map(async (m) => {
      const full = await db.portfolio.findUnique({ where: { slug: m.slug }, include: { aiSummary: true } });
      if (!full) return null;
      return {
        ...mapPortfolioWire(full),
        matchReason: {
          technologies: m.matchedTechnologies,
          keywords: m.matchedKeywords,
        },
      };
    })
  );
  return {
    items: hydrated.filter(Boolean),
    page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

function safeParse(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

type Minimal = { slug: string; name: string; role: string | null; technologies: string[] };

function rankByIntent(rows: Minimal[], plan: Plan) {
  const scored = rows.map((row) => {
    let score = 0;
    const techHits = row.technologies.filter((t) => plan.technologies.includes(t));
    score += techHits.length * 30;
    const haystack = `${row.name} ${row.role ?? ""}`.toLowerCase();
    const matchedKeywords: string[] = [];
    for (const kw of plan.keywords) {
      const tokens = kw.split(/\s+/).filter(Boolean);
      if (tokens.some((t) => haystack.includes(t) || row.technologies.some((tech) => tech.includes(t)))) {
        score += 12;
        matchedKeywords.push(kw);
      }
    }
    for (const ex of plan.exclusions) if (haystack.includes(ex)) score -= 50;
    return { row, score, techHits, keywordHits: matchedKeywords };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name, "en", { sensitivity: "base" }))
    .map((s) => ({
      slug: s.row.slug,
      matchedTechnologies: s.techHits,
      matchedKeywords: s.keywordHits,
      relevanceScore: s.score,
    }));
}
