import type { MetadataRoute } from "next";
import indexJson from "@/data/portfolios.generated.json";
import { COLLECTION_DEFS } from "@/lib/portfolio/collections";
import { loadCatalog } from "@/lib/store/queries";
import { engagementEnabled } from "@/lib/engagement/server";
import { loadClientIndex, MIN_TECH_COUNT, SITE_URL } from "@/lib/site/index-data";

// Regenerated hourly; data changes at most daily.
export const revalidate = 3600;

/**
 * Canonical indexable URLs (PRD §11.3): no query URLs, no filter permutations,
 * no empty categories. `lastModified` is always a real date — the data sync
 * time for listing pages, the upstream commit date for portfolio pages — and
 * is omitted where no honest date exists.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = loadClientIndex();
  const synced = new Date(index.generatedAt);
  const url = (path: string) => `${SITE_URL}${path}`;
  const listing = (path: string, changeFrequency: "daily" | "weekly", priority: number) => ({
    url: url(path),
    lastModified: synced,
    changeFrequency,
    priority,
  });

  const letters = new Set((indexJson as unknown as { portfolios: Array<{ letter: string }> }).portfolios.map((p) => p.letter.toLowerCase()));

  // Portfolio pages with supplied role text (the rest are noindex as thin content).
  let profiles: MetadataRoute.Sitemap = [];
  try {
    const { entries } = await loadCatalog();
    profiles = entries
      .filter((e) => e.wire.role)
      .map((e) => ({
        url: url(`/portfolio/${e.wire.slug}`),
        lastModified: new Date(e.wire.sourceUpdatedAt ?? e.wire.firstSeenAt),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      }));
  } catch (err) {
    console.error("[sitemap] portfolio pages omitted (database unavailable):", err instanceof Error ? err.message : err);
  }

  return [
    listing("/", "daily", 1),
    listing("/portfolios", "daily", 0.9),
    listing("/technologies", "weekly", 0.7),
    ...(engagementEnabled() ? [{ url: url("/leaderboard"), changeFrequency: "daily" as const, priority: 0.7 }] : []),
    ...index.technologies.filter((t) => t.count >= MIN_TECH_COUNT).map((t) => listing(`/technologies/${t.slug}`, "weekly", 0.6)),
    ...COLLECTION_DEFS.map((c) => listing(`/collections/${c.slug}`, "weekly", 0.5)),
    ..."abcdefghijklmnopqrstuvwxyz".split("").filter((l) => letters.has(l)).map((l) => listing(`/portfolios/letter/${l}`, "weekly", 0.4)),
    { url: url("/about"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/methodology"), changeFrequency: "monthly", priority: 0.3 },
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    ...profiles,
  ];
}
