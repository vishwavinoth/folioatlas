import { Suspense, cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FolioAtlasApp } from "@/components/folioatlas-app";
import type { PrefetchMap } from "@/hooks/prefetch-context";
import { collectionBySlug } from "@/lib/portfolio/collections";
import { technologyLabel } from "@/lib/portfolio/classify";
import { getCollections, getPortfolioBySlug, loadCatalog, type WirePortfolio } from "@/lib/store/queries";
import {
  detailPayload,
  growthPayload,
  leaderboardPayload,
  searchPayload,
  statsPayload,
  technologiesPayload,
  technologyPayload,
  type LeaderboardResponse,
} from "@/lib/store/payloads";
import type { SearchResult } from "@/lib/store/catalog";
import { aiAvailable } from "@/lib/ai/provider";
import { engagementEnabled } from "@/lib/engagement/server";
import { parseAnchor, parseMetric, parsePeriod } from "@/lib/engagement/period";
import { parseSearchQuery } from "@/lib/server/request";
import {
  DEFAULT_GROWTH_RANGE,
  detailApiUrl,
  growthApiUrl,
  leaderboardApiUrl,
  searchApiUrl,
  technologyApiUrl,
  type RouteLike,
} from "@/lib/router/api-urls";
import { loadClientIndex, SITE_URL } from "@/lib/site/index-data";
import { CREATOR, creatorLinks } from "@/lib/site/creator";

type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Kind =
  | "home"
  | "portfolios"
  | "letter"
  | "technologies"
  | "technology"
  | "collection"
  | "portfolio"
  | "leaderboard"
  | "about"
  | "methodology"
  | "privacy";

type Crumb = { name: string; path: string };

type PageInfo = {
  kind: Kind;
  path: string;
  title: string;
  /** Absolute titles skip the "| FolioAtlas" template (home). */
  absoluteTitle?: boolean;
  description: string;
  breadcrumbs: Crumb[];
  /** Thin pages (e.g. entries with only a name + URL) are noindex,follow. */
  indexable: boolean;
  schemaType: "WebPage" | "CollectionPage" | "ProfilePage" | "AboutPage";
  slug?: string;
  portfolio?: WirePortfolio;
  ogImage?: string;
};

const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "FolioAtlas — discover real developer portfolios" };
const fmt = (n: number) => n.toLocaleString("en-US");

/** Trim to a search-result-friendly length at a word boundary. */
function clamp(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:—–-]$/, "")}…`;
}

/** First clause of upstream role text ("Full Stack Developer | React…" → "Full Stack Developer"). */
function roleHeadline(role: string | null): string | null {
  const head = role?.split(/\s[|•·–—-]\s|[|•·,]/)[0]?.trim();
  return head && head.length >= 3 && head.length <= 40 ? head : null;
}

type Catalog = Awaited<ReturnType<typeof loadCatalog>>;

/** Catalog for live counts; null when the database is unreachable (counts fall back to the build artifact). */
async function catalogOrNull(): Promise<Catalog | null> {
  try {
    return await loadCatalog();
  } catch {
    return null;
  }
}

/** Resolve a URL to its page, or null when the route does not exist (→ 404). Memoized per request. */
const resolvePage = cache(async (segments: string[]): Promise<PageInfo | null> => {
  const index = loadClientIndex();
  const catalog = await catalogOrNull();
  const total = catalog?.entries.length ?? index.stats.valid;
  const parts = segments.map((s) => decodeURIComponent(s).toLowerCase());
  const path = "/" + parts.join("/");
  const home: Crumb = { name: "Home", path: "/" };
  const page = (p: Omit<PageInfo, "path" | "indexable" | "schemaType"> & Partial<PageInfo>): PageInfo => ({
    path,
    indexable: true,
    schemaType: "WebPage",
    ...p,
  });
  const [first, second, third, ...rest] = parts;
  if (rest.length > 0) return null;

  if (!first) {
    return page({
      kind: "home",
      title: `FolioAtlas — ${fmt(Math.floor(total / 100) * 100)}+ Real Developer Portfolio Examples`,
      absoluteTitle: true,
      description: clamp(
        `Browse ${fmt(total)} real developer portfolio examples for inspiration. Search by name or focus area — React, Full Stack, AI/ML and more — synced daily.`
      ),
      breadcrumbs: [],
      schemaType: "CollectionPage",
    });
  }

  if (first === "portfolios" && !second) {
    return page({
      kind: "portfolios",
      title: `Developer Portfolio Examples — ${fmt(total)} Real Sites`,
      description: clamp(
        `Search, filter and sort ${fmt(total)} real developer portfolios by name, domain and focus area. Every entry links to the original site and is synced daily.`
      ),
      breadcrumbs: [home, { name: "Portfolios", path }],
      schemaType: "CollectionPage",
    });
  }

  if (first === "portfolios" && second === "letter" && third && /^[a-z]$/.test(third) && parts.length === 3) {
    const letter = third.toUpperCase();
    const n = catalog?.entries.filter((e) => e.wire.letter === letter).length ?? null;
    if (n === 0) return null;
    return page({
      kind: "letter",
      title: `Developer Portfolios Starting With ${letter}${n ? ` (${fmt(n)})` : ""}`,
      description: clamp(
        `${n ? fmt(n) : "All"} developer portfolios whose names start with ${letter} — real sites from the open-source developer-portfolios list, synced daily.`
      ),
      breadcrumbs: [home, { name: "Portfolios", path: "/portfolios" }, { name: letter, path }],
      schemaType: "CollectionPage",
    });
  }

  if (first === "technologies" && !third) {
    if (!second) {
      return page({
        kind: "technologies",
        title: "Developer Portfolios by Focus Area",
        description: clamp(
          `Browse ${fmt(total)} developer portfolios across ${index.technologies.length} focus areas — Full Stack, AI/ML, Frontend, DevOps and more — classified from each developer's own role text.`
        ),
        breadcrumbs: [home, { name: "Focus areas", path }],
        schemaType: "CollectionPage",
      });
    }
    const tech = index.technologies.find((t) => t.slug === second);
    if (!tech) return null;
    const n = catalog?.entries.filter((e) => e.wire.technologies.includes(tech.slug)).length ?? tech.count;
    return page({
      kind: "technology",
      slug: tech.slug,
      title: `${tech.label} Developer Portfolios — ${fmt(n)} Real Examples`,
      description: clamp(
        `Explore ${fmt(n)} real ${tech.label} developer portfolio examples for inspiration. Focus areas come from each developer's own role text; every entry links to the original site.`
      ),
      breadcrumbs: [home, { name: "Focus areas", path: "/technologies" }, { name: tech.label, path }],
      schemaType: "CollectionPage",
      indexable: n > 0,
    });
  }

  if (first === "collections" && second && !third) {
    const collection = collectionBySlug(second);
    if (!collection) return null;
    const n = catalog ? ((await getCollections()).find((c) => c.slug === collection.slug)?.count ?? null) : null;
    return page({
      kind: "collection",
      slug: collection.slug,
      title: `${collection.label} Developer Portfolios${n ? ` — ${fmt(n)} Examples` : ""}`,
      description: clamp(`${collection.description} ${n ? `${fmt(n)} real portfolios` : "Real portfolios"}, synced daily from the open-source developer-portfolios list.`),
      breadcrumbs: [home, { name: "Portfolios", path: "/portfolios" }, { name: collection.label, path }],
      schemaType: "CollectionPage",
    });
  }

  if (first === "portfolio" && second && !third) {
    if (!/^[a-z0-9-]{1,80}$/.test(second)) return null;
    let portfolio: WirePortfolio | null;
    try {
      portfolio = await getPortfolioBySlug(second);
    } catch {
      // Database unavailable: render the shell (client retries) rather than a false 404.
      return page({
        kind: "portfolio",
        slug: second,
        title: "Developer Portfolio",
        description: "A developer portfolio from the open-source developer-portfolios directory.",
        breadcrumbs: [home, { name: "Portfolios", path: "/portfolios" }],
        indexable: false,
        schemaType: "ProfilePage",
      });
    }
    if (!portfolio) return null;
    const headline = roleHeadline(portfolio.role);
    const withRole = headline ? `${portfolio.name} – ${headline} Portfolio` : null;
    const focus = portfolio.technologies.slice(0, 3).map(technologyLabel).join(", ");
    return page({
      kind: "portfolio",
      slug: portfolio.slug,
      portfolio,
      title: withRole && withRole.length <= 60 ? withRole : `${portfolio.name} – Developer Portfolio`,
      description: clamp(
        `View ${portfolio.name}'s developer portfolio${portfolio.role ? ` — ${portfolio.role}` : ""}.${focus ? ` Focus areas: ${focus}.` : ""} One of ${fmt(total)} real portfolios on FolioAtlas.`
      ),
      breadcrumbs: [home, { name: "Portfolios", path: "/portfolios" }, { name: portfolio.name, path }],
      // Entries with only a name and a URL are too thin to index on their own.
      indexable: Boolean(portfolio.role),
      schemaType: "ProfilePage",
      ogImage: `/og/portfolio/${portfolio.slug}`,
    });
  }

  if (first === "leaderboard" && !second) {
    if (!engagementEnabled()) return null;
    return page({
      kind: "leaderboard",
      title: "Portfolio Leaderboard — Most Liked & Viewed",
      description:
        "The most liked and most viewed developer portfolios on FolioAtlas, ranked daily, weekly, monthly, yearly and all time by real visitor activity.",
      breadcrumbs: [home, { name: "Leaderboard", path }],
      schemaType: "CollectionPage",
    });
  }

  const content: Partial<Record<string, Pick<PageInfo, "kind" | "title" | "description" | "schemaType">>> = {
    about: {
      kind: "about",
      title: "About FolioAtlas",
      description: "What FolioAtlas is, where its data comes from, who built it and how the directory stays honest.",
      schemaType: "AboutPage",
    },
    methodology: {
      kind: "methodology",
      title: "Methodology — How the Directory Is Built",
      description: "How FolioAtlas parses, validates, classifies and verifies the portfolio directory and its growth history.",
      schemaType: "WebPage",
    },
    privacy: {
      kind: "privacy",
      title: "Privacy",
      description: "What FolioAtlas collects (very little), how likes and views stay anonymous, and how to request corrections.",
      schemaType: "WebPage",
    },
  };
  const c = content[first];
  if (c && !second) return page({ ...c, breadcrumbs: [home, { name: c.title.split(" — ")[0], path }] });

  return null;
});

function routeFrom(path: string, sp: Record<string, string | string[] | undefined>): RouteLike {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach((x) => query.append(k, x));
    else if (typeof v === "string") query.append(k, v);
  }
  return { path, query };
}

/**
 * Render the API responses this page's views will request, keyed by the
 * exact URL, so the HTML ships with real content. Best-effort: on failure
 * the views fetch on the client as before.
 */
async function buildPrefetch(page: PageInfo, route: RouteLike): Promise<PrefetchMap> {
  const out: PrefetchMap = {};
  const withSearch = async () => {
    const url = searchApiUrl(route);
    out[url] = await searchPayload(parseSearchQuery(new URLSearchParams(url.slice(url.indexOf("?") + 1))));
  };
  try {
    switch (page.kind) {
      case "home": {
        const [stats, growth] = await Promise.all([statsPayload(), growthPayload(DEFAULT_GROWTH_RANGE)]);
        out["/api/stats"] = stats;
        out[growthApiUrl(DEFAULT_GROWTH_RANGE)] = growth;
        break;
      }
      case "portfolios":
      case "letter":
      case "collection":
        await withSearch();
        break;
      case "technology": {
        const tech = await technologyPayload(page.slug!);
        if (tech) out[technologyApiUrl(page.slug!)] = tech;
        await withSearch();
        break;
      }
      case "technologies":
        out["/api/technologies"] = await technologiesPayload();
        break;
      case "portfolio": {
        const detail = await detailPayload(page.slug!);
        if (detail) out[detailApiUrl(page.slug!)] = detail;
        break;
      }
      case "leaderboard": {
        const url = leaderboardApiUrl(route);
        const q = new URLSearchParams(url.slice(url.indexOf("?") + 1));
        out[url] = await leaderboardPayload(parsePeriod(q.get("period")), parseAnchor(q.get("date")), parseMetric(q.get("metric")));
        break;
      }
    }
  } catch (err) {
    console.error("[page] server render data unavailable; the client will fetch:", err instanceof Error ? err.message : err);
    return {};
  }
  return out;
}

/** Schema.org graph: WebSite + creator + this page (+ breadcrumbs, list or profile). */
function structuredData(page: PageInfo, prefetch: PrefetchMap, route: RouteLike) {
  const url = `${SITE_URL}${page.path === "/" ? "/" : page.path}`;
  const absolute = (p: string) => `${SITE_URL}${p}`;
  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: "FolioAtlas",
    description: "A searchable directory of real developer portfolios, synced daily from the open-source developer-portfolios list.",
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#creator` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/portfolios?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
  const creator = {
    "@type": "Person",
    "@id": `${SITE_URL}/#creator`,
    name: CREATOR.name,
    jobTitle: CREATOR.role,
    url: CREATOR.portfolioUrl,
    sameAs: creatorLinks()
      .map((l) => l.href)
      .filter((h) => h !== CREATOR.portfolioUrl),
  };

  const listItems = (() => {
    if (page.kind === "leaderboard") {
      const board = prefetch[leaderboardApiUrl(route)] as LeaderboardResponse | undefined;
      return board?.items.map((i) => i.portfolio);
    }
    if (["portfolios", "letter", "technology", "collection"].includes(page.kind)) {
      return (prefetch[searchApiUrl(route)] as SearchResult | undefined)?.items;
    }
    return undefined;
  })();

  const p = page.portfolio;
  const node: Record<string, unknown> = {
    "@type": page.schemaType,
    "@id": `${url}#webpage`,
    url,
    name: page.absoluteTitle ? page.title : `${page.title} | FolioAtlas`,
    description: page.description,
    inLanguage: "en",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    ...(page.breadcrumbs.length > 1 ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
    ...(listItems && listItems.length > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: listItems.length,
            itemListElement: listItems.slice(0, 24).map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: absolute(`/portfolio/${item.slug}`),
              name: item.name,
            })),
          },
        }
      : {}),
    ...(p
      ? {
          dateCreated: p.firstSeenAt,
          dateModified: p.sourceUpdatedAt ?? p.lastSeenAt,
          mainEntity: {
            "@type": "Person",
            name: p.name,
            url: p.portfolioUrl,
            ...(p.role ? { description: p.role } : {}),
          },
        }
      : {}),
  };
  const breadcrumb =
    page.breadcrumbs.length > 1
      ? {
          "@type": "BreadcrumbList",
          "@id": `${url}#breadcrumb`,
          itemListElement: page.breadcrumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: absolute(c.path === "/" ? "/" : c.path),
          })),
        }
      : null;

  return { "@context": "https://schema.org", "@graph": [website, creator, node, ...(breadcrumb ? [breadcrumb] : [])] };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const page = await resolvePage((await params).slug ?? []);
  if (!page) return { title: "Page not found", robots: { index: false } };
  // Search/filter permutations are shareable but never indexed (PRD §11.3).
  const hasQuery = Object.keys(await searchParams).length > 0;
  const fullTitle = page.absoluteTitle ? page.title : `${page.title} | FolioAtlas`;
  const image = page.ogImage ? { url: page.ogImage, width: 1200, height: 630, alt: fullTitle } : OG_IMAGE;
  return {
    title: page.absoluteTitle ? { absolute: page.title } : page.title,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      title: fullTitle,
      description: page.description,
      url: page.path,
      siteName: "FolioAtlas",
      type: page.kind === "portfolio" ? "profile" : "website",
      locale: "en_US",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description: page.description, images: [image.url] },
    ...(hasQuery || !page.indexable ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function Page({ params, searchParams }: Props) {
  const page = await resolvePage((await params).slug ?? []);
  if (!page) notFound();

  const route = routeFrom(page.path, await searchParams);
  const prefetch = await buildPrefetch(page, route);
  const jsonLd = structuredData(page, prefetch, route);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Suspense>
        <FolioAtlasApp
          index={loadClientIndex()}
          features={{ ai: await aiAvailable(), engagement: engagementEnabled() }}
          prefetch={prefetch}
        />
      </Suspense>
    </>
  );
}
