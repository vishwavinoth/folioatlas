import reportJson from "@/data/sync-report.generated.json";
import indexJson from "@/data/portfolios.generated.json";
import type { ClientIndex } from "@/lib/portfolio/types";
import { FolioAtlasApp } from "@/components/folioatlas-app";

/**
 * Server component: embeds a SLIM index (stats + technologies only).
 *
 * Portfolio data is intentionally NOT embedded in the client bundle any more —
 * the directory is served by the database-backed /api/search endpoint with
 * server-side pagination (PRD §5). The generated artifact stays the build-time
 * source of truth for canonical technology labels and stats.
 */
function loadClientIndex(): ClientIndex {
  const report = reportJson as unknown as {
    source: ClientIndex["source"];
    generatedAt: string;
    stats: ClientIndex["stats"];
  };
  const index = indexJson as unknown as {
    technologies: ClientIndex["technologies"];
    stats?: ClientIndex["stats"];
  };
  return {
    schemaVersion: 1,
    source: report.source,
    generatedAt: report.generatedAt,
    stats: report.stats,
    technologies: index.technologies,
    portfolios: [], // served via /api/search — never shipped to the browser
  };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function Page() {
  const index = loadClientIndex();

  // Structured data: WebSite with the real, functioning directory search.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FolioAtlas",
    alternateName: "FolioAtlas — Discover Developer Portfolios",
    url: SITE_URL,
    description:
      "A searchable directory of real developer portfolios sourced from the open-source emmabostian/developer-portfolios repository.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/#/portfolios?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FolioAtlasApp index={index} />
    </>
  );
}
