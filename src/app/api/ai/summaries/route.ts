import { db } from "@/lib/db";
import { getPortfolioBySlug } from "@/lib/store/queries";
import { jsonError } from "@/lib/server/request";
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

  const portfolio = await getPortfolioBySlug(slug);
  if (!portfolio) return jsonError("not-found", 404);

  const raw = await db.portfolio.findUnique({ where: { slug }, select: { sourceEntryHash: true } });
  if (!raw) return jsonError("not-found", 404);

  const result = await generateSummaryFor(
    {
      id: portfolio.id,
      name: portfolio.name,
      role: portfolio.role,
      portfolioUrl: portfolio.portfolioUrl,
      technologies: portfolio.technologies,
      sourceEntryHash: raw.sourceEntryHash,
    },
    { force: true }
  );

  if (result.status === "failed") {
    const status = result.errorCode === "no-llm-provider" ? 503 : 502;
    return Response.json({ error: result.errorCode ?? "summary-failed" }, { status });
  }

  const stored = await db.portfolioAiSummary.findUnique({ where: { portfolioId: portfolio.id } });
  return Response.json({
    status: "complete",
    summary: stored
      ? {
          summary: stored.summary,
          keyTechnologies: JSON.parse(stored.keyTechnologies || "[]"),
          specialties: JSON.parse(stored.specialties || "[]"),
          model: stored.model,
          generatedAt: stored.generatedAt,
        }
      : null,
  });
}
