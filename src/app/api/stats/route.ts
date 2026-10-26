import { getPlatformStats, getRecentlyAdded, getFeatured, getCollections, listTechnologies } from "@/lib/store/queries";
import { jsonError } from "@/lib/server/request";

export const dynamic = "force-dynamic";

type Cached = { at: number; data: unknown };
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, Cached>();

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T;
  const data = await loader();
  cache.set(key, { at: Date.now(), data });
  return data;
}

/**
 * GET /api/stats — verified platform statistics for the HomeView hero and
 * discovery sections. Short in-memory cache; values change only on sync.
 */
export async function GET() {
  try {
    const [stats, recent, featured, collections, technologies] = await Promise.all([
      cached("stats", getPlatformStats),
      cached("recent", () => getRecentlyAdded(8)),
      cached("featured", () => getFeatured(4)),
      cached("collections", getCollections),
      cached("technologies", () => listTechnologies()),
    ]);
    return Response.json(
      { stats, recentlyAdded: recent, featured, collections, technologies: technologies.slice(0, 14) },
      { headers: { "cache-control": "public, max-age=60" } }
    );
  } catch (err) {
    console.error("[api/stats] failed:", err);
    return jsonError("stats-failed", 500);
  }
}
