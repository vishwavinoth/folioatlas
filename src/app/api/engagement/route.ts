import { loadCatalog } from "@/lib/store/queries";
import { engagementEnabled, getCounts, isAutomated, recordEvent, VISITOR_ID_RE } from "@/lib/engagement/server";
import { jsonError, serverError } from "@/lib/server/request";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]{1,80}$/;

/**
 * GET /api/engagement?slugs=a,b — all-time likes, views and site visits.
 * Fresh on every request (no CDN cache) so a visitor's own like is never
 * contradicted by a stale count.
 */
export async function GET(req: Request) {
  if (!engagementEnabled()) return jsonError("engagement-disabled", 503);
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "")
    .split(",")
    .filter((s) => SLUG_RE.test(s))
    .slice(0, 100);
  try {
    const { bySlug } = await loadCatalog();
    const known = slugs.map((slug) => bySlug.get(slug)).filter((e) => e !== undefined);
    const counts = await getCounts(known.map((e) => e.wire.id));
    const out: Record<string, { likes: number; views: number; visits: number }> = {};
    for (const e of known) out[e.wire.slug] = counts.get(e.wire.id) ?? { likes: 0, views: 0, visits: 0 };
    return Response.json({ counts: out }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return serverError("api/engagement", err, "engagement-failed");
  }
}

/**
 * POST /api/engagement — record a portfolio view or site visit.
 * Body: { slug, kind: "view" | "visit", vid }. Always answers 204 so the
 * response reveals nothing about deduplication or caps.
 */
export async function POST(req: Request) {
  const done = () => new Response(null, { status: 204 });
  if (!engagementEnabled() || isAutomated(req.headers.get("user-agent"))) return done();
  if (!rateLimit(`event:${clientIp(req)}`, 120, 60_000).allowed) return done();

  let body: { slug?: unknown; kind?: unknown; vid?: unknown };
  try {
    body = JSON.parse(await req.text()) as typeof body;
  } catch {
    return jsonError("invalid-json", 400);
  }
  const slug = typeof body.slug === "string" ? body.slug : "";
  const kind = body.kind === "view" || body.kind === "visit" ? body.kind : null;
  const vid = typeof body.vid === "string" ? body.vid : "";
  if (!SLUG_RE.test(slug) || !kind || !VISITOR_ID_RE.test(vid)) return jsonError("invalid-request", 400);

  try {
    const entry = (await loadCatalog()).bySlug.get(slug);
    if (entry) await recordEvent(entry.wire.id, kind, vid, clientIp(req));
  } catch (err) {
    console.error("[api/engagement] event not recorded:", err instanceof Error ? err.message : err);
  }
  return done();
}
