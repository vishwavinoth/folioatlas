import { getPortfolioBySlug } from "@/lib/store/queries";
import { resolvePreview, activeProvider } from "@/lib/server/preview";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import { sha1HexNode } from "@/lib/server/hash";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Status tracking is best-effort: on read-only hosts (e.g. the bundled SQLite
 * file on Vercel) the write fails, but the redirect must still be served.
 */
async function recordPreview(write: Promise<unknown>): Promise<void> {
  try {
    await write;
  } catch (err) {
    console.warn("[api/preview] status not recorded:", err instanceof Error ? err.message : err);
  }
}

/**
 * GET /api/preview/[slug] — resolves the preview image URL server-side and
 * 302-redirects to it. Provider credentials never reach the client.
 * The resolution is recorded in portfolio_previews for status tracking.
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
    const sourceUrlHash = sha1HexNode(portfolio.portfolioUrl);

    if (!resolution.ok) {
      // Persist unavailability so the UI can show an explicit state.
      await recordPreview(db.portfolioPreview.upsert({
        where: { portfolioId: portfolio.id },
        create: {
          portfolioId: portfolio.id,
          status: "unavailable",
          provider: "none",
          sourceUrlHash,
          errorCode: "previews-disabled",
        },
        update: { status: "unavailable", provider: "none", errorCode: "previews-disabled" },
      }));
      return new Response("Previews are disabled on this deployment", { status: 501 });
    }

    await recordPreview(db.portfolioPreview.upsert({
      where: { portfolioId: portfolio.id },
      create: {
        portfolioId: portfolio.id,
        status: "pending",
        provider: resolution.provider,
        imageUrl: null, // never store signed provider URLs at rest
        sourceUrlHash,
      },
      update: { status: "pending", provider: resolution.provider },
    }));

    return new Response(null, {
      status: 302,
      headers: {
        location: resolution.imageUrl,
        "cache-control": "public, max-age=86400",
        "x-folioatlas-provider": resolution.provider,
      },
    });
  } catch (err) {
    console.error("[api/preview] failed:", err);
    return new Response("Preview resolution failed", { status: 500 });
  }
}
