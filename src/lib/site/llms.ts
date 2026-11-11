/**
 * FolioAtlas — llms.txt (https://llmstxt.org): a Markdown map of the site
 * for AI assistants, plus llms-full.txt with the complete directory.
 * Built from the generated artifact, which is refreshed by the daily sync.
 */
import indexJson from "@/data/portfolios.generated.json";
import { COLLECTION_DEFS } from "@/lib/portfolio/collections";
import { technologyLabel } from "@/lib/portfolio/classify";
import { CREATOR } from "@/lib/site/creator";
import { loadClientIndex, MIN_TECH_COUNT, SITE_URL } from "@/lib/site/index-data";

type ArtifactPortfolio = { id: string; name: string; url: string; description?: string | null; technologies?: string[]; letter: string };

const portfolios = () => (indexJson as unknown as { portfolios: ArtifactPortfolio[] }).portfolios;
const fmt = (n: number) => n.toLocaleString("en-US");
/** Keep Markdown link text intact. */
const md = (s: string) => s.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();

function summary(): string[] {
  const index = loadClientIndex();
  const synced = index.generatedAt.slice(0, 10);
  const commit = index.source.commit ? `, upstream commit ${index.source.commit.slice(0, 7)}` : "";
  return [
    "# FolioAtlas",
    "",
    `> FolioAtlas is a free, searchable directory of ${fmt(index.stats.valid)} real developer portfolios, synced daily from the open-source GitHub list ${index.source.repository}. Every entry links to the developer's own website. Focus areas (Full Stack, React, AI/ML, …) are classified only from the role text each developer wrote; nothing is invented.`,
    "",
    `- Source: https://github.com/${index.source.repository} (synced ${synced}${commit})`,
    `- ${fmt(index.stats.valid)} portfolios across ${index.technologies.length} focus areas; updated automatically every day`,
    "- Free, no sign-up, no tracking cookies; likes and views are anonymous FolioAtlas visitor activity",
    `- Built by ${CREATOR.name} (${CREATOR.portfolioUrl})`,
    "",
  ];
}

export function llmsTxt(): string {
  const index = loadClientIndex();
  const lines = [
    ...summary(),
    "## Browse",
    "",
    `- [All portfolios](${SITE_URL}/portfolios): search by name, domain or focus area; filter and sort`,
    `- [Focus areas](${SITE_URL}/technologies): portfolios grouped by primary focus area`,
    `- [Leaderboard](${SITE_URL}/leaderboard): most liked and viewed portfolios — daily, weekly, monthly, yearly, all time`,
    `- [A–Z](${SITE_URL}/portfolios/letter/a): alphabetical browsing`,
    `- Portfolio pages: ${SITE_URL}/portfolio/{id}, e.g. [${CREATOR.name}](${SITE_URL}/portfolio/${CREATOR.directorySlug})`,
    "",
    "## Focus areas",
    "",
    ...index.technologies
      .filter((t) => t.count >= MIN_TECH_COUNT)
      .map((t) => `- [${t.label} developer portfolios](${SITE_URL}/technologies/${t.slug}): ${fmt(t.count)} portfolios`),
    "",
    "## Collections",
    "",
    ...COLLECTION_DEFS.map((c) => `- [${c.label}](${SITE_URL}/collections/${c.slug}): ${c.description}`),
    "",
    "## About",
    "",
    `- [About](${SITE_URL}/about): what FolioAtlas is and who built it`,
    `- [Methodology](${SITE_URL}/methodology): parsing, validation, classification and verified growth history`,
    `- [Privacy](${SITE_URL}/privacy): what is (and is not) collected`,
    "",
    "## Optional",
    "",
    `- [Full directory](${SITE_URL}/llms-full.txt): every portfolio with its website, role text and focus areas`,
    `- [Sitemap](${SITE_URL}/sitemap.xml)`,
    "",
  ];
  return lines.join("\n");
}

export function llmsFullTxt(): string {
  const byLetter = new Map<string, ArtifactPortfolio[]>();
  for (const p of portfolios()) {
    const list = byLetter.get(p.letter) ?? [];
    list.push(p);
    byLetter.set(p.letter, list);
  }
  const lines = [
    ...summary(),
    "Each entry: name (links to the developer's own site) — role text as written by the developer · focus areas · FolioAtlas page.",
    "",
  ];
  for (const letter of [...byLetter.keys()].sort()) {
    lines.push(`## ${letter}`, "");
    for (const p of byLetter.get(letter)!.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))) {
      const role = p.description ? ` — ${md(p.description)}` : "";
      const focus = p.technologies?.length ? ` · ${p.technologies.map(technologyLabel).join(", ")}` : "";
      lines.push(`- [${md(p.name)}](${p.url})${role}${focus} · ${SITE_URL}/portfolio/${p.id}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
