import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getPortfolioBySlug, loadCatalog } from "@/lib/store/queries";
import { technologyLabel } from "@/lib/portfolio/classify";

export const dynamic = "force-dynamic";

const FONT_DIR = join(process.cwd(), "src", "app", "og", "fonts");
let fonts: Promise<[Buffer, Buffer]> | null = null;
const loadFonts = () =>
  (fonts ??= Promise.all([readFile(join(FONT_DIR, "DejaVuSans.ttf")), readFile(join(FONT_DIR, "DejaVuSans-Bold.ttf"))]));

/** Characters DejaVu Sans covers well (Latin, Greek, Cyrillic, punctuation). */
const SUPPORTED = /^[\u0000-ԯḀ-ỿ -⁯₠-₿]*$/;

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/**
 * GET /og/portfolio/[slug] — 1200×630 social card for a portfolio page:
 * name, verbatim role text, focus areas and domain. Only renders data from
 * the directory (no user-supplied text); falls back to the site card.
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const fallback = () => Response.redirect(new URL("/og.png", req.url), 302);
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return fallback();

  let p;
  let total = 0;
  try {
    [p, total] = await Promise.all([getPortfolioBySlug(slug), loadCatalog().then((c) => c.entries.length)]);
  } catch {
    return fallback();
  }
  if (!p) return fallback();

  const role = p.role ? cut(p.role, 110) : "Developer portfolio";
  if (!SUPPORTED.test(p.name + role)) return fallback();
  let host = p.portfolioUrl;
  try {
    host = new URL(p.portfolioUrl).host.replace(/^www\./, "");
  } catch {
    /* validated upstream */
  }
  const focus = p.technologies.slice(0, 3).map(technologyLabel);
  const [regular, bold] = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 96px",
          backgroundColor: "#101114",
          backgroundImage:
            "radial-gradient(circle at 12% 0%, rgba(10,132,255,0.30), transparent 55%), radial-gradient(circle at 92% 18%, rgba(94,92,230,0.24), transparent 55%)",
          color: "#F5F5F7",
          fontFamily: "DejaVu Sans",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#0A84FF" />
            <circle cx="32" cy="32" r="17" fill="none" stroke="#ffffff" strokeWidth="3.5" />
            <polygon points="32,22 36.5,36.5 27.5,36.5" fill="#ffffff" transform="rotate(45 32 32)" />
            <circle cx="32" cy="32" r="2.6" fill="#0A84FF" stroke="#ffffff" strokeWidth="1.8" />
          </svg>
          <span style={{ fontSize: 32, fontWeight: 700 }}>FolioAtlas</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: p.name.length > 22 ? 64 : 80, fontWeight: 700, lineHeight: 1.05 }}>{cut(p.name, 40)}</span>
          <span style={{ fontSize: 32, color: "#C7C7CC", lineHeight: 1.3 }}>{role}</span>
          {focus.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              {focus.map((f) => (
                <span
                  key={f}
                  style={{
                    fontSize: 24,
                    padding: "8px 20px",
                    borderRadius: 999,
                    border: "1.5px solid rgba(10,132,255,0.55)",
                    backgroundColor: "rgba(10,132,255,0.14)",
                    color: "#7CC0FF",
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#8E8E93" }}>
          <span>{cut(host, 48)}</span>
          <span>{total > 0 ? `One of ${total.toLocaleString("en-US")} real portfolios` : "Real developer portfolios"}</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "DejaVu Sans", data: regular, weight: 400, style: "normal" },
        { name: "DejaVu Sans", data: bold, weight: 700, style: "normal" },
      ],
      headers: { "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" },
    }
  );
}
