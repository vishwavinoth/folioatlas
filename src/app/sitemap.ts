import type { MetadataRoute } from "next";
import indexJson from "@/data/portfolios.generated.json";
import { COLLECTION_DEFS } from "@/lib/portfolio/collections";
import { loadClientIndex, MIN_TECH_COUNT, SITE_URL } from "@/lib/site/index-data";

/**
 * Canonical indexable URLs (PRD §11.3): no query URLs, no filter permutations,
 * no empty categories. `lastModified` is the real data-sync time from the
 * generated artifact — never an invented per-page timestamp.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const index = loadClientIndex();
  const synced = new Date(index.generatedAt);
  const url = (path: string) => `${SITE_URL}${path}`;
  const entry = (path: string, changeFrequency: "daily" | "weekly" | "monthly" | "yearly", priority: number) => ({
    url: url(path),
    changeFrequency,
    priority,
    lastModified: synced,
  });

  // Only letters that actually have entries (no empty pages).
  const letters = new Set((indexJson as unknown as { portfolios: Array<{ letter: string }> }).portfolios.map((p) => p.letter.toLowerCase()));

  return [
    entry("/", "daily", 1),
    entry("/portfolios", "daily", 0.9),
    entry("/technologies", "weekly", 0.7),
    ...index.technologies.filter((t) => t.count >= MIN_TECH_COUNT).map((t) => entry(`/technologies/${t.slug}`, "weekly", 0.6)),
    ...COLLECTION_DEFS.map((c) => entry(`/collections/${c.slug}`, "weekly", 0.5)),
    ..."abcdefghijklmnopqrstuvwxyz".split("").filter((l) => letters.has(l)).map((l) => entry(`/portfolios/letter/${l}`, "weekly", 0.5)),
    { url: url("/about"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/methodology"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.3 },
  ];
}
