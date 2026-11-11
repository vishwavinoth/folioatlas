import { loadCatalog } from "@/lib/store/queries";
import { engagementEnabled, isAutomated, setReaction, VISITOR_ID_RE } from "@/lib/engagement/server";
import { jsonError, serverError } from "@/lib/server/request";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/reactions — like or unlike a portfolio.
 * Body: { slug, vid, liked: boolean } → { liked, likes }.
 * One like per visitor per portfolio; a per-network daily cap limits abuse.
 */
export async function POST(req: Request) {
  if (!engagementEnabled()) return jsonError("engagement-disabled", 503);
  if (isAutomated(req.headers.get("user-agent"))) return jsonError("forbidden", 403);
  const limit = rateLimit(`reaction:${clientIp(req)}`, 30, 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: "rate-limited", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
    );
  }

  let body: { slug?: unknown; vid?: unknown; liked?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("invalid-json", 400);
  }
  const slug = typeof body.slug === "string" ? body.slug : "";
  const vid = typeof body.vid === "string" ? body.vid : "";
  if (!/^[a-z0-9-]{1,80}$/.test(slug) || !VISITOR_ID_RE.test(vid) || typeof body.liked !== "boolean") {
    return jsonError("invalid-request", 400);
  }

  try {
    const entry = (await loadCatalog()).bySlug.get(slug);
    if (!entry) return jsonError("not-found", 404);
    const result = await setReaction(entry.wire.id, vid, clientIp(req), body.liked);
    if (result.capped) {
      return Response.json(
        { error: "daily-limit", liked: result.liked, likes: result.likes },
        { status: 429, headers: { "cache-control": "no-store" } }
      );
    }
    return Response.json({ liked: result.liked, likes: result.likes }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return serverError("api/reactions", err, "reaction-failed");
  }
}
