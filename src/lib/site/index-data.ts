import reportJson from "@/data/sync-report.generated.json";
import indexJson from "@/data/portfolios.generated.json";
import type { ClientIndex } from "@/lib/portfolio/types";

/**
 * Slim build-time index (stats + technology vocabulary). Portfolio rows are
 * never shipped to the browser; they are served by the Supabase-backed API.
 */
export function loadClientIndex(): ClientIndex {
  const report = reportJson as unknown as {
    source: ClientIndex["source"];
    generatedAt: string;
    stats: ClientIndex["stats"];
  };
  const index = indexJson as unknown as { technologies: ClientIndex["technologies"] };
  return {
    schemaVersion: 1,
    source: report.source,
    generatedAt: report.generatedAt,
    stats: report.stats,
    technologies: index.technologies,
    portfolios: [],
  };
}

/** Single configured production origin for canonical URLs (PRD §11.1). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Technology landing pages with fewer entries stay out of the sitemap (PRD §11.3). */
export const MIN_TECH_COUNT = 5;
