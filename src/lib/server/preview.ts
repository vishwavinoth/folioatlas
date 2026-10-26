/**
 * FolioAtlas — server-side website preview (screenshot) provider abstraction.
 *
 * The client NEVER talks to a provider directly: it requests
 * `/api/preview/[slug]`, which resolves a safe image URL server-side and
 * 302-redirects. Provider choice, credentials and rate-limit strategy stay
 * on the server and can change without touching the client.
 *
 * Providers:
 *  - "screenshotone": configured via SCREENSHOT_ONE_ACCESS_KEY (trusted,
 *    signed requests; key never leaves the server).
 *  - "mshots" (default): WordPress mShots public endpoint — no credentials,
 *    used so previews work out of the box. Respect its fair-use terms.
 *
 * If neither is desirable in a deployment, set PREVIEW_PROVIDER="none" to
 * disable previews entirely (the UI then shows an explicit unavailable
 * state — never a fabricated screenshot).
 */

export type PreviewProvider = "screenshotone" | "mshots" | "none";

export type PreviewResolution =
  | { ok: true; provider: PreviewProvider; imageUrl: string }
  | { ok: false; reason: "disabled" | "invalid-portfolio-url" };

const HTTP_URL_RE = /^https?:\/\//i;

export function activeProvider(): PreviewProvider {
  const configured = (process.env.PREVIEW_PROVIDER || "").toLowerCase();
  if (configured === "none") return "none";
  if (process.env.SCREENSHOT_ONE_ACCESS_KEY) return "screenshotone";
  return "mshots";
}

export function resolvePreview(portfolioUrl: string): PreviewResolution {
  const provider = activeProvider();
  if (provider === "none") return { ok: false, reason: "disabled" };
  if (!HTTP_URL_RE.test(portfolioUrl)) return { ok: false, reason: "invalid-portfolio-url" };

  const target = encodeURIComponent(portfolioUrl);
  if (provider === "screenshotone") {
    const accessKey = process.env.SCREENSHOT_ONE_ACCESS_KEY as string;
    const params = new URLSearchParams({
      access_key: accessKey,
      url: portfolioUrl,
      width: "640",
      height: "400",
      format: "jpg",
      cache: "true",
      hide_popups: "true",
      block_ads: "true",
    });
    return { ok: true, provider, imageUrl: `https://api.screenshotone.com/take?${params.toString()}` };
  }

  return { ok: true, provider: "mshots", imageUrl: `https://s0.wp.com/mshots/v1/${target}?w=640&h=400` };
}
