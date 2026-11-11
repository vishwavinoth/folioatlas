import { detailPayload } from "@/lib/store/payloads";
import { jsonError, serverError, PUBLIC_CACHE } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api/portfolios/[slug] — detail payload for the shareable profile page:
 * the portfolio, its AI summary (when available) and related portfolios.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return jsonError("invalid-slug", 400);

  try {
    const payload = await detailPayload(slug);
    if (!payload) return jsonError("not-found", 404);
    return Response.json(payload, { headers: { "cache-control": PUBLIC_CACHE } });
  } catch (err) {
    return serverError("api/portfolios/detail", err, "detail-failed");
  }
}
