import { getPlatformStats, getRecentlyAdded, getFeatured, getCollections, listTechnologies } from "@/lib/store/queries";
import { serverError, PUBLIC_CACHE } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats — verified platform statistics for the HomeView hero and
 * discovery sections. Backed by the cached catalog; values change only on sync.
 */
export async function GET() {
  try {
    const [stats, recent, featured, collections, technologies] = await Promise.all([
      getPlatformStats(),
      getRecentlyAdded(8),
      getFeatured(4),
      getCollections(),
      listTechnologies(),
    ]);
    return Response.json(
      { stats, recentlyAdded: recent, featured, collections, technologies: technologies.slice(0, 14) },
      { headers: { "cache-control": PUBLIC_CACHE } }
    );
  } catch (err) {
    return serverError("api/stats", err, "stats-failed");
  }
}
