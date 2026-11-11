import { leaderboardPayload } from "@/lib/store/payloads";
import { engagementEnabled } from "@/lib/engagement/server";
import { parseAnchor, parseMetric, parsePeriod } from "@/lib/engagement/period";
import { jsonError, serverError } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api/leaderboard?period=daily|weekly|monthly|yearly|all&date=YYYY-MM-DD&metric=likes|views
 * Ranked portfolios for the period containing `date` (UTC).
 */
export async function GET(req: Request) {
  if (!engagementEnabled()) return jsonError("engagement-disabled", 503);
  const q = new URL(req.url).searchParams;
  try {
    const payload = await leaderboardPayload(parsePeriod(q.get("period")), parseAnchor(q.get("date")), parseMetric(q.get("metric")));
    return Response.json(payload, {
      headers: { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    return serverError("api/leaderboard", err, "leaderboard-failed");
  }
}
