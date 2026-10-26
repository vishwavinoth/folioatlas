import { getGrowthSeries } from "@/lib/store/queries";
import { parseGrowthRange, serverError, PUBLIC_CACHE } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api/growth?range=30d|90d|1y|all — verified portfolio-count history.
 *
 * Data integrity: points come exclusively from PortfolioCountSnapshot rows
 * (provenance "git-history" → verified upstream commits with recorded SHAs,
 * or "sync-run" → our own successful syncs). Nothing is interpolated beyond
 * documented bucketing; the response states the verified coverage window.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = parseGrowthRange(url.searchParams);
  try {
    const series = await getGrowthSeries(range);
    return Response.json(series, { headers: { "cache-control": PUBLIC_CACHE } });
  } catch (err) {
    return serverError("api/growth", err, "growth-failed");
  }
}
