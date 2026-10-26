import type { MetadataRoute } from "next";
import indexJson from "@/data/portfolios.generated.json";

/**
 * Canonical indexable URLs (PRD §11.3). Only meaningful pages are included:
 * no search-permutation pages, no empty categories, no query URLs.
 * MIN_TECH_COUNT keeps near-empty technology pages out of the sitemap.
 */
const MIN_TECH_COUNT = 5;

export default function sitemap(): MetadataRoute.Sitemap {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const data = indexJson as unknown as {
    technologies: Array<{ slug: string; count: number }>;
  };
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1, lastModified: now },
    { url: `${SITE_URL}/#/portfolios`, changeFrequency: "daily", priority: 0.9, lastModified: now },
    { url: `${SITE_URL}/#/technologies`, changeFrequency: "weekly", priority: 0.7, lastModified: now },
    { url: `${SITE_URL}/#/about`, changeFrequency: "monthly", priority: 0.4, lastModified: now },
    { url: `${SITE_URL}/#/methodology`, changeFrequency: "monthly", priority: 0.4, lastModified: now },
    { url: `${SITE_URL}/#/privacy`, changeFrequency: "yearly", priority: 0.3, lastModified: now },
  ];

  const techRoutes: MetadataRoute.Sitemap = data.technologies
    .filter((t) => t.count >= MIN_TECH_COUNT)
    .map((t) => ({
      url: `${SITE_URL}/#/technologies/${t.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      lastModified: now,
    }));

  const letterRoutes: MetadataRoute.Sitemap = "abcdefghijklmnopqrstuvwxyz"
    .split("")
    .map((letter) => ({
      url: `${SITE_URL}/#/portfolios/letter/${letter}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
      lastModified: now,
    }));

  return [...staticRoutes, ...techRoutes, ...letterRoutes];
}
