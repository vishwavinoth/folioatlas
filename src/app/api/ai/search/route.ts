import { listTechnologies, loadCatalog } from "@/lib/store/queries";
import { intentSearch, paginate } from "@/lib/store/catalog";
import { jsonError, serverError } from "@/lib/server/request";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import { completeJson, extractJson } from "@/lib/ai/provider";
import { buildIntentPrompt, validateIntent, planFromIntent, type SearchIntent } from "@/lib/ai/search-intent";
import { createIntentCache } from "@/lib/ai/intent-cache";

export const dynamic = "force-dynamic";

const intents = createIntentCache<{ intent: SearchIntent; model: string }>();

/**
 * POST /api/ai/search — natural-language portfolio search.
 *
 * Flow: cached intent, or rate limit → LLM intent (validated against canonical vocabulary) →
 * REAL query plan over the directory → transparent results with match reasons.
 * The model never invents records; it only shapes a query that the database
 * executes against real records. Falls back with a machine-readable error so the client can
 * switch to keyword search.
 */
export async function POST(req: Request) {
  let body: { query?: unknown };
  try {
    body = (await req.json()) as { query?: unknown };
  } catch {
    return jsonError("invalid-json", 400);
  }
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 300) : "";
  if (!query) return jsonError("missing-query", 400);

  // Only uncached queries spend LLM quota, so only they are rate-limited.
  let pending = intents.peek(query);
  if (!pending) {
    const limit = rateLimit(`ai-search:${clientIp(req)}`, 10, 60_000);
    if (!limit.allowed) {
      return Response.json(
        { error: "rate-limited", retryAfterSeconds: limit.retryAfterSeconds },
        { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
      );
    }
    pending = intents.fill(query, async () => {
      const technologies = await listTechnologies();
      const knownSlugs = new Set(technologies.map((t) => t.slug));
      const { system, user } = buildIntentPrompt(query, technologies.slice(0, 30));
      const llm = await completeJson({ system, user, maxTokens: 450 });
      return { intent: validateIntent(extractJson(llm.raw), knownSlugs), model: llm.model };
    });
  }

  try {
    const { intent, model } = await pending;
    const plan = planFromIntent(intent);

    // Execute the REAL query: technologies (AND) + keywords (each must hit
    // a searchable field) + exclusions (must not hit).
    const matches = intentSearch((await loadCatalog()).entries, plan);
    const page = paginate(matches, 1, 24);
    const results = {
      ...page,
      // Transparent match reasons explaining WHY each result matched.
      items: page.items.map((m) => ({
        ...m.portfolio,
        matchReason: { technologies: m.matchedTechnologies, keywords: m.matchedKeywords },
      })),
    };

    return Response.json({
      mode: "ai" as const,
      query,
      interpretation: intent.interpretation,
      confidence: intent.confidence,
      intent: { technologies: plan.technologies, keywords: plan.keywords, exclusions: plan.exclusions },
      model,
      exactCount: matches.filter((m) => m.complete).length,
      results,
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    if (name === "LlmUnavailableError" || name === "LlmRequestError") {
      if (name === "LlmRequestError") console.warn("[api/ai/search] provider error:", (err as Error).message.slice(0, 200));
      return Response.json(
        { error: "ai-unavailable", detail: "AI search is temporarily unavailable — keyword search still works." },
        { status: 503 }
      );
    }
    return serverError("api/ai/search", err, "ai-search-failed");
  }
}
