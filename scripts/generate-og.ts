/**
 * FolioAtlas — Open Graph social image generator.
 * Renders a restrained 1200×630 brand card using the ACTUAL index stats
 * (no invented numbers) and writes public/og.png.
 * Runs in the daily sync workflow so the count on shared links stays current.
 * Usage: bun scripts/generate-og.ts
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const index = JSON.parse(readFileSync(join(ROOT, "src", "data", "portfolios.generated.json"), "utf8")) as {
  stats: { valid: number; classified: number };
  technologies: Array<{ slug: string; label: string; count: number }>;
  source: { repository: string; branch: string; commit: string | null };
};

const count = index.stats.valid.toLocaleString("en-US");
const topTech = index.technologies
  .slice(0, 3)
  .map((t) => t.label)
  .join("  ·  ");

// Lay the stat row out from text length (DejaVu Sans is the fallback font on
// CI/Linux; ~0.62em per bold glyph, ~0.56em per regular glyph at these sizes).
const countLabel = `${count} portfolios`;
const pillWidth = Math.round(countLabel.length * 26 * 0.62 + 56);
const techX = 120 + pillWidth + 28;

/** Escape XML special characters for safe SVG interpolation. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="a1" cx="14%" cy="-8%" r="55%">
      <stop offset="0%" stop-color="#0A84FF" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#0A84FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="a2" cx="90%" cy="20%" r="55%">
      <stop offset="0%" stop-color="#5E5CE6" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#5E5CE6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="a3" cx="25%" cy="105%" r="50%">
      <stop offset="0%" stop-color="#30B0C7" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#30B0C7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.04"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="#101114"/>
  <rect width="1200" height="630" fill="url(#a1)"/>
  <rect width="1200" height="630" fill="url(#a2)"/>
  <rect width="1200" height="630" fill="url(#a3)"/>

  <!-- brand mark -->
  <g transform="translate(120 132)">
    <rect width="76" height="76" rx="18" fill="#0A84FF"/>
    <g transform="translate(38 38)">
      <circle r="20" fill="none" stroke="#FFFFFF" stroke-width="4"/>
      <polygon points="0,-11.5 5.2,5.2 -5.2,5.2" fill="#FFFFFF" transform="rotate(45)"/>
      <circle r="3" fill="#0A84FF" stroke="#FFFFFF" stroke-width="2"/>
    </g>
  </g>
  <text x="214" y="184" font-family="-apple-system, 'Segoe UI', 'DejaVu Sans', sans-serif" font-size="40" font-weight="600" fill="#F5F5F7">FolioAtlas</text>

  <!-- headline -->
  <text x="120" y="316" font-family="-apple-system, 'Segoe UI', 'DejaVu Sans', sans-serif" font-size="72" font-weight="700" fill="#F5F5F7">Discover real developer</text>
  <text x="120" y="400" font-family="-apple-system, 'Segoe UI', 'DejaVu Sans', sans-serif" font-size="72" font-weight="700" fill="#F5F5F7">portfolios.</text>

  <!-- stat pill + focus areas -->
  <g transform="translate(120 466)">
    <rect width="${pillWidth}" height="64" rx="32" fill="#0A84FF" fill-opacity="0.16" stroke="#0A84FF" stroke-opacity="0.45"/>
    <text x="${pillWidth / 2}" y="41" text-anchor="middle" font-family="-apple-system, 'Segoe UI', 'DejaVu Sans', sans-serif" font-size="26" font-weight="600" fill="#5AB0FF">${esc(countLabel)}</text>
  </g>
  <text x="${techX}" y="507" font-family="-apple-system, 'Segoe UI', 'DejaVu Sans', sans-serif" font-size="24" fill="#A1A1A6">${esc(topTech)}</text>

  <!-- source line -->
  <text x="120" y="586" font-family="-apple-system, 'Segoe UI', 'DejaVu Sans', sans-serif" font-size="22" fill="#8E8E93">Synced daily from github.com/${esc(index.source.repository)}</text>
</svg>
`;

const out = join(ROOT, "public", "og.png");
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
console.log(`[og] wrote ${out} (${count} portfolios)`);
