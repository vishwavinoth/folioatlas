import indexJson from "@/data/portfolios.generated.json";
import type { ClientIndex } from "@/lib/portfolio/types";
import { FolioAtlasApp } from "@/components/folioatlas-app";

/**
 * Server component: loads the generated, versioned data artifact (PRD §7.8)
 * and embeds it for the client router. Provenance fields stay in the
 * artifact on disk; the wire payload carries the lean shape.
 */
function loadClientIndex(): ClientIndex {
  const raw = indexJson as unknown as {
    schemaVersion: number;
    source: ClientIndex["source"];
    generatedAt: string;
    stats: ClientIndex["stats"];
    technologies: ClientIndex["technologies"];
    portfolios: Array<Record<string, unknown>>;
  };
  return {
    schemaVersion: raw.schemaVersion,
    source: raw.source,
    generatedAt: raw.generatedAt,
    stats: raw.stats,
    technologies: raw.technologies,
    portfolios: raw.portfolios.map((p) => ({
      id: p.id as string,
      name: p.name as string,
      url: p.url as string,
      ...(typeof p.description === "string" ? { description: p.description } : {}),
      ...(Array.isArray(p.technologies) ? { technologies: p.technologies as string[] } : {}),
      letter: p.letter as string,
    })),
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
