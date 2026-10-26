import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FolioAtlasApp } from "@/components/folioatlas-app";
import { collectionBySlug } from "@/lib/portfolio/collections";
import { getPortfolioBySlug, type WirePortfolio } from "@/lib/store/queries";
import { llmConfigured } from "@/lib/ai/provider";
import { loadClientIndex, SITE_URL } from "@/lib/site/index-data";

type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type PageInfo = {
  path: string;
  title: string;
  /** Absolute titles skip the "| FolioAtlas" template (home). */
  absoluteTitle?: boolean;
  description: string;
  breadcrumbs: Array<{ name: string; path: string }>;
};

const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "FolioAtlas — discover real developer portfolios" };

const HOME_DESCRIPTION =
  "Explore real developer portfolios from an open-source directory. Search by developer name, portfolio URL, and primary focus areas.";

/** Portfolio lookup that never turns a database outage into a false 404. */
async function findPortfolio(slug: string): Promise<WirePortfolio | null | "unavailable"> {
  try {
    return await getPortfolioBySlug(slug);
  } catch {
    return "unavailable";
  }
}

/** Resolve a URL to page metadata, or null when the route does not exist. */
async function resolvePage(segments: string[]): Promise<PageInfo | null> {
  const index = loadClientIndex();
  const parts = segments.map((s) => decodeURIComponent(s).toLowerCase());
  const path = "/" + parts.join("/");
  const crumbs = (...extra: Array<{ name: string; path: string }>) => [{ name: "Home", path: "/" }, ...extra];
  const [first, second, third, ...rest] = parts;
  if (rest.length > 0) return null;

  if (!first) {
    return { path: "/", title: "FolioAtlas — Discover Developer Portfolios", absoluteTitle: true, description: HOME_DESCRIPTION, breadcrumbs: [] };
  }

  if (first === "portfolios" && !second) {
    return {
      path,
      title: "Developer Portfolio Directory",
      description: `Search and filter ${index.stats.valid.toLocaleString("en-US")} real developer portfolios by name, URL, domain and focus area.`,
      breadcrumbs: crumbs({ name: "Portfolios", path }),
    };
  }

  if (first === "portfolios" && second === "letter" && third && /^[a-z]$/.test(third) && parts.length === 3) {
    const letter = third.toUpperCase();
    return {
      path,
      title: `Developer Portfolios Starting with ${letter}`,
      description: `Developer portfolios whose names start with ${letter}, from the open-source developer-portfolios directory.`,
      breadcrumbs: crumbs({ name: "Portfolios", path: "/portfolios" }, { name: letter, path }),
    };
  }

  if (first === "technologies" && !third) {
    if (!second) {
      return {
        path,
        title: "Browse by Focus Area",
        description: "Browse developer portfolios by primary focus area, classified transparently from role text supplied in the source.",
        breadcrumbs: crumbs({ name: "Focus areas", path }),
      };
    }
    const tech = index.technologies.find((t) => t.slug === second);
    if (!tech) return null;
    return {
      path,
      title: `${tech.label} Developer Portfolios`,
      description: `${tech.count.toLocaleString("en-US")} developer portfolios whose role text mentions ${tech.label}, from an open-source directory.`,
      breadcrumbs: crumbs({ name: "Focus areas", path: "/technologies" }, { name: tech.label, path }),
    };
  }

  if (first === "collections" && second && !third) {
    const collection = collectionBySlug(second);
    if (!collection) return null;
    return {
      path,
      title: `${collection.label} Developer Portfolios`,
      description: `${collection.description} A curated view of real developer portfolios.`,
      breadcrumbs: crumbs({ name: "Portfolios", path: "/portfolios" }, { name: collection.label, path }),
    };
  }

  if (first === "portfolio" && second && !third) {
    if (!/^[a-z0-9-]{1,80}$/.test(second)) return null;
    const portfolio = await findPortfolio(second);
    if (portfolio === null) return null;
    if (portfolio === "unavailable") {
      return { path, title: "Developer Portfolio", description: HOME_DESCRIPTION, breadcrumbs: crumbs({ name: "Portfolios", path: "/portfolios" }) };
    }
    const role = portfolio.role ? ` — ${portfolio.role}` : "";
    return {
      path,
      title: `${portfolio.name}${role}`,
      description: `${portfolio.name}'s developer portfolio${portfolio.role ? ` (${portfolio.role})` : ""}, listed in the open-source developer-portfolios directory.`,
      breadcrumbs: crumbs({ name: "Portfolios", path: "/portfolios" }, { name: portfolio.name, path }),
    };
  }

  const content: Record<string, { title: string; description: string }> = {
    about: { title: "About", description: "What FolioAtlas is, where its data comes from and how the directory stays honest." },
    methodology: {
      title: "Methodology",
      description: "How FolioAtlas parses, validates, classifies and verifies the portfolio directory and its growth history.",
    },
    privacy: { title: "Privacy", description: "What FolioAtlas collects (very little), what it never does, and how to request corrections." },
  };
  if (content[first] && !second) {
    return { path, ...content[first], breadcrumbs: crumbs({ name: content[first].title, path }) };
  }

  return null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const page = await resolvePage((await params).slug ?? []);
  if (!page) return { title: "Page not found", robots: { index: false } };
  // Search/filter permutations are useful to share but must not be indexed (PRD §11.3).
  const hasQuery = Object.keys(await searchParams).length > 0;
  return {
    title: page.absoluteTitle ? { absolute: page.title } : page.title,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      title: page.title,
      description: page.description,
      url: page.path,
      siteName: "FolioAtlas",
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [OG_IMAGE.url] },
    ...(hasQuery ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function Page({ params }: Props) {
  const page = await resolvePage((await params).slug ?? []);
  if (!page) notFound();

  const jsonLd =
    page.path === "/"
      ? {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "FolioAtlas",
          url: `${SITE_URL}/`,
          description: HOME_DESCRIPTION,
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/portfolios?q={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        }
      : {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: page.breadcrumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: `${SITE_URL}${c.path === "/" ? "/" : c.path}`,
          })),
        };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Suspense>
        <FolioAtlasApp index={loadClientIndex()} features={{ ai: llmConfigured() }} />
      </Suspense>
    </>
  );
}
