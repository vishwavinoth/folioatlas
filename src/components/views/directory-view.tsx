"use client";

import { useMemo } from "react";
import type { ClientIndex } from "@/lib/portfolio/types";
import { technologyLabel } from "@/lib/portfolio/classify";
import {
  buildSearchFields,
  DEFAULT_QUERY,
  filterPortfolios,
  letterCounts,
  paginate,
  sortPortfolios,
  type SortOption,
} from "@/lib/portfolio/directory";
import { buildHref, navigateHash, type Route } from "@/lib/router/hash-router";
import { GlassSearchField } from "@/components/search/glass-search-field";
import { GlassFilterBar } from "@/components/filters/glass-filter-bar";
import { AlphabetNavigator } from "@/components/directory/alphabet-navigator";
import { PortfolioCard } from "@/components/directory/portfolio-card";
import { Pagination } from "@/components/directory/pagination";
import { EmptyState } from "@/components/feedback/states";

type Props = {
  index: ClientIndex;
  route: Route;
};

export function DirectoryView({ index, route }: Props) {
  const isTechRoute = route.path.startsWith("/technologies/");
  const techSlugFromPath = isTechRoute ? route.path.split("/")[2] || null : null;
  const letterFromPath = route.path.startsWith("/portfolios/letter/")
    ? (route.path.split("/")[3]?.toUpperCase() ?? null)
    : null;

  const q = route.query.get("q") ?? "";
  const tech = techSlugFromPath ?? route.query.get("tech") ?? null;
  const sortParam = route.query.get("sort");
  const sort: SortOption = sortParam === "name-desc" ? "name-desc" : "name-asc";
  const page = Math.max(1, Number(route.query.get("page") ?? "1") || 1);

  const fieldsById = useMemo(
    () => new Map(index.portfolios.map((p) => [p.id, buildSearchFields(p)])),
    [index.portfolios]
  );

  const filtered = useMemo(
    () => filterPortfolios(index.portfolios, fieldsById, { q, letter: letterFromPath, technology: tech }),
    [index.portfolios, fieldsById, q, letterFromPath, tech]
  );
  const sorted = useMemo(() => sortPortfolios(filtered, sort), [filtered, sort]);
  const result = useMemo(() => paginate(sorted, page), [sorted, page]);
  const letters = useMemo(() => letterCounts(index.portfolios), [index.portfolios]);

  const activeTech = tech ? index.technologies.find((t) => t.slug === tech) ?? null : null;
  const activeTechLabel = activeTech ? activeTech.label : tech ? technologyLabel(tech) : null;

  /** Query-only href (keeps current path; letter lives in the path already). */
  const baseParams = () => ({
    q: q || null,
    tech: techSlugFromPath ? null : tech,
    sort: sort !== "name-asc" ? sort : null,
    page: null as string | null,
  });

  const withPage = (nextPage: number) =>
    buildHref(route.path, { ...baseParams(), page: nextPage > 1 ? String(nextPage) : null });

  const setQuery = (patch: Record<string, string | null>, opts?: { replace?: boolean }) => {
    navigateHash(buildHref(route.path, { ...baseParams(), ...patch }), opts?.replace ?? true);
  };

  const heading = (() => {
    if (activeTechLabel && letterFromPath) return `${activeTechLabel} portfolios starting with ${letterFromPath}`;
    if (activeTechLabel) return `${activeTechLabel} portfolios`;
    if (letterFromPath) return `Portfolios starting with ${letterFromPath}`;
    return "Developer Portfolio Directory";
  })();

  const subheading = q
    ? `Matching “${q}” — ${result.total.toLocaleString()} result${result.total === 1 ? "" : "s"}`
    : "Search by name, URL, domain or focus area. Every entry links to the original portfolio.";

  return (
    <div className="motion-fade-in mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:pt-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fa-text-secondary)]">{subheading}</p>
      </header>

      <div className="mt-6">
        <GlassSearchField
          value={q}
          onChange={(next) => setQuery({ q: next || null, page: null }, { replace: true })}
          placeholder="Search by name, URL, domain or focus area…"
          id="directory-search"
        />
      </div>

      <div className="mt-3">
        <GlassFilterBar
          technologies={index.technologies}
          active={{ q, letter: letterFromPath, technology: tech }}
          activeTechLabel={activeTechLabel}
          sort={sort}
          onSortChange={(next) => setQuery({ sort: next === "name-asc" ? null : next, page: null })}
          onTechnologyChange={(slug) => {
            if (slug === null) {
              // Leave tech view entirely; keep other filters.
              navigateHash(buildHref("/portfolios", { q: q || null, sort: sort !== "name-asc" ? sort : null }));
            } else if (isTechRoute) {
              navigateHash(buildHref(`/technologies/${slug}`, { q: q || null, sort: sort !== "name-asc" ? sort : null }));
            } else {
              setQuery({ tech: slug, page: null });
            }
          }}
          onRemoveFilter={(key) => {
            if (key === "q") setQuery({ q: null, page: null });
            if (key === "letter") navigateHash(buildHref("/portfolios", { q: q || null, tech: techSlugFromPath ? null : tech, sort: sort !== "name-asc" ? sort : null }));
            if (key === "technology") {
              if (isTechRoute) navigateHash(buildHref("/portfolios", { q: q || null, sort: sort !== "name-asc" ? sort : null }));
              else setQuery({ tech: null, page: null });
            }
          }}
          onClearAll={() => navigateHash(buildHref("/portfolios"))}
          resultCount={result.total}
          totalCount={index.stats.valid}
        />
      </div>

      <div className="mt-3">
        <AlphabetNavigator
          counts={letters}
          activeLetter={letterFromPath}
          makeHref={(letter) => {
            if (letter === null) {
              return buildHref("/portfolios", { q: q || null, tech: techSlugFromPath ? null : tech, sort: sort !== "name-asc" ? sort : null });
            }
            return buildHref(`/portfolios/letter/${letter.toLowerCase()}`, {
              q: q || null,
              tech: techSlugFromPath ? null : tech,
              sort: sort !== "name-asc" ? sort : null,
            });
          }}
        />
      </div>

      <p className="mt-6 text-sm text-[var(--fa-text-secondary)] sm:hidden" role="status" aria-live="polite">
        {result.total.toLocaleString()} of {index.stats.valid.toLocaleString()} portfolios
      </p>

      <div className="mt-4" id="results">
        {result.items.length === 0 ? (
          <EmptyState
            query={q}
            onClearFilters={() => navigateHash(buildHref("/portfolios"))}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.items.map((p) => (
                <PortfolioCard key={p.id} portfolio={p} />
              ))}
            </div>
            <div className="mt-8">
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                makeHref={withPage}
                onPageFallback={(nextPage) => {
                  navigateHash(withPage(nextPage));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { DEFAULT_QUERY };
