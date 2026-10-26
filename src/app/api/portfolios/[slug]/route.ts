import { getPortfolioBySlug, getRelatedPortfolios } from "@/lib/store/queries";
import { jsonError } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api/portfolios/[slug] — detail payload for the shareable profile page:
 * the portfolio, its AI summary (when available) and related portfolios.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return jsonError("invalid-slug", 400);

  try {
    const portfolio = await getPortfolioBySlug(slug);
    if (!portfolio) return jsonError("not-found", 404);
    const related = await getRelatedPortfolios(portfolio, 4);
    return Response.json({ portfolio, related }, { headers: { "cache-control": "public, max-age=60" } });
  } catch (err) {
    console.error("[api/portfolios/detail] failed:", err);
    return jsonError("detail-failed", 500);
  }
}
