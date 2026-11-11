import { technologiesPayload, technologyPayload } from "@/lib/store/payloads";
import { jsonError, serverError, PUBLIC_CACHE } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api/technologies — full canonical technology list with real counts.
 * GET /api/technologies?slug=react — one technology + co-occurrence related.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  try {
    if (slug) {
      if (!/^[a-z0-9-]{1,40}$/.test(slug)) return jsonError("invalid-slug", 400);
      const payload = await technologyPayload(slug);
      if (!payload) return jsonError("not-found", 404);
      return Response.json(payload, { headers: { "cache-control": PUBLIC_CACHE } });
    }
    return Response.json(await technologiesPayload(), { headers: { "cache-control": PUBLIC_CACHE } });
  } catch (err) {
    return serverError("api/technologies", err, "technologies-failed");
  }
}
