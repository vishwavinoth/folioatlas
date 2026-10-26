import { listTechnologies, getRelatedTechnologies } from "@/lib/store/queries";
import { jsonError } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api/technologies — full canonical technology list with real counts.
 * GET /api/technologies?slug=react — one technology + co-occurrence related.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  try {
    if (slug) {
      if (!/^[a-z0-9-]{1,40}$/.test(slug)) return jsonError("invalid-slug", 400);
      const all = await listTechnologies();
      const meta = all.find((t) => t.slug === slug);
      if (!meta) return jsonError("not-found", 404);
      const related = await getRelatedTechnologies(slug, 8);
      return Response.json({ technology: meta, related }, { headers: { "cache-control": "public, max-age=300" } });
    }
    const all = await listTechnologies();
    return Response.json({ technologies: all }, { headers: { "cache-control": "public, max-age=300" } });
  } catch (err) {
    console.error("[api/technologies] failed:", err);
    return jsonError("technologies-failed", 500);
  }
}
