import { statsPayload } from "@/lib/store/payloads";
import { serverError, PUBLIC_CACHE } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats — verified platform statistics for the HomeView hero and
 * discovery sections. Backed by the cached catalog; values change only on sync.
 */
export async function GET() {
  try {
    return Response.json(await statsPayload(), { headers: { "cache-control": PUBLIC_CACHE } });
  } catch (err) {
    return serverError("api/stats", err, "stats-failed");
  }
}
