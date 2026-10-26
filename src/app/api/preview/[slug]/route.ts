import { getPortfolioBySlug } from "@/lib/store/queries";
import { resolvePreview } from "@/lib/server/preview";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import { serverError } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api/preview/[slug] — resolves the preview image URL server-side and
 * 302-redirects to it. Provider credentials never reach the client.
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  // Basic abuse guard: previews are cheap redirects but unbounded.
  const limit = rateLimit(`preview:${clientIp(req)}`, 120, 60_000);
  if (!limit.allowed) {
    return new Response("Too many preview requests", {
      status: 429,
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return new Response("Invalid slug", { status: 400 });

  try {
    const portfolio = await getPortfolioBySlug(slug);
    if (!portfolio) return new Response("Not found", { status: 404 });

    const resolution = resolvePreview(portfolio.portfolioUrl);
    if (!resolution.ok) return new Response("Previews are disabled on this deployment", { status: 501 });

    return new Response(null, {
      status: 302,
      headers: {
        location: resolution.imageUrl,
        "cache-control": "public, max-age=86400",
        "x-folioatlas-provider": resolution.provider,
      },
    });
  } catch (err) {
    return serverError("api/preview", err, "preview-failed");
  }
}
