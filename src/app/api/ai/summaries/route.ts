import { getPortfolioBySlug, getSourceEntryHash, invalidateCatalog } from "@/lib/store/queries";
import { jsonError, serverError } from "@/lib/server/request";
import { dbWriter } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import { generateSummaryFor } from "@/lib/ai/summaries";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/summaries — generate (or refresh) the AI summary for one
 * portfolio. Rate-limited per IP; the summary is persisted and reused, so
 * this is a cache-fill operation, not a per-view render step.
 *
 * Body: { slug: string }
 */
export async function POST(req: Request) {
  if (!dbWriter()) return jsonError("summaries-disabled", 503, "SUPABASE_SECRET_KEY is not configured.");

  const limit = rateLimit(`ai-summary:${clientIp(req)}`, 6, 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: "rate-limited", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
    );
  }

  let body: { slug?: unknown };
  try {
    body = (await req.json()) as { slug?: unknown };
  } catch {
    return jsonError("invalid-json", 400);
  }
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return jsonError("invalid-slug", 400);

  try {
    const portfolio = await getPortfolioBySlug(slug);
    const sourceEntryHash = await getSourceEntryHash(slug);
    if (!portfolio || sourceEntryHash === null) return jsonError("not-found", 404);

    const result = await generateSummaryFor({
      id: portfolio.id,
      name: portfolio.name,
      role: portfolio.role,
      portfolioUrl: portfolio.portfolioUrl,
      technologies: portfolio.technologies,
      sourceEntryHash,
    });

    if (result.status === "failed") {
      const status = result.errorCode === "no-llm-provider" ? 503 : 502;
      return Response.json({ error: result.errorCode ?? "summary-failed" }, { status });
    }

    invalidateCatalog();
    const refreshed = await getPortfolioBySlug(slug);
    return Response.json({ status: "complete", summary: refreshed?.aiSummary ?? null });
  } catch (err) {
    return serverError("api/ai/summaries", err, "summary-failed");
  }
}
