import { searchPortfolios } from "@/lib/store/queries";
import { parseSearchQuery, jsonError } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api/search — server-side keyword search, filters, sort, pagination.
 * Query params (validated in parseSearchQuery):
 *   q, tech (comma-separated AND), letter, site=any|own|github,
 *   hasSummary=true, addedWithin=30|90|365, sort, page, pageSize
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = parseSearchQuery(url.searchParams);
  try {
    const result = await searchPortfolios(params);
    return Response.json(result, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (err) {
    console.error("[api/search] failed:", err);
    return jsonError("search-failed", 500);
  }
}
