"use client";

import { ArrowUpRight, Tags } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { TechnologyMeta } from "@/lib/api-types";
import type { ClientIndex } from "@/lib/portfolio/types";
import { CLASSIFICATION_RULES } from "@/lib/portfolio/classify";
import { TechnologyChip } from "@/components/directory/technology-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { DirectoryView } from "./directory-view";
import type { Route } from "@/lib/router/hash-router";

/** Technology index — canonical focus areas with real, live counts. */
export function TechnologiesView({ index }: { index: ClientIndex }) {
  const { data } = useApi<{ technologies: TechnologyMeta[] }>("/api/technologies");
  const technologies = data?.technologies ?? index.technologies;

  return (
    <div className="motion-fade-in mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:pt-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Browse by primary focus area</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fa-text-secondary)]">
          Categories are derived deterministically from the role labels supplied in the upstream repository — never
          guessed from URLs. Counts are computed live over the indexed directory.
        </p>
      </header>

      <ul className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {technologies.map((tech) => {
          const blurb = CLASSIFICATION_RULES.find((r) => r.slug === tech.slug)?.blurb;
          return (
            <li key={tech.slug}>
              <a
                href={`#/technologies/${tech.slug}`}
                className="surface-card motion-lift group flex h-full flex-col rounded-2xl p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--fa-accent)]/10 text-[var(--fa-accent)]">
                      <Tags className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <h2 className="text-[15px] font-semibold">{tech.label}</h2>
                  </div>
                  <ArrowUpRight
                    className="h-4 w-4 text-[var(--fa-text-secondary)] opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </div>
                {blurb && <p className="mt-2 text-[13px] leading-relaxed text-[var(--fa-text-secondary)]">{blurb}</p>}
                <p className="mt-auto pt-3 text-[13px] font-medium text-[var(--fa-text-secondary)]">
                  {tech.count.toLocaleString()} portfolio{tech.count === 1 ? "" : "s"}
                </p>
              </a>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-sm text-[var(--fa-text-secondary)]">
        Missing something? Labels are intentionally conservative —{" "}
        <a href="#/methodology" className="text-[var(--fa-accent)] hover:underline">
          read how classification works
        </a>
        .
      </p>
    </div>
  );
}

type LandingData = {
  technology: TechnologyMeta;
  related: TechnologyMeta[];
};

/**
 * Technology landing page (PRD §10): description, live count, related
 * technologies (real co-occurrence) and the full filterable result set.
 */
export function TechnologyLandingView({ slug, index, route }: { slug: string; index: ClientIndex; route: Route }) {
  const { data, loading } = useApi<LandingData>(`/api/technologies?slug=${encodeURIComponent(slug)}`);
  const blurb = CLASSIFICATION_RULES.find((r) => r.slug === slug)?.blurb;
  const label = data?.technology.label ?? CLASSIFICATION_RULES.find((r) => r.slug === slug)?.label ?? slug;

  return (
    <div className="motion-fade-in">
      <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:pt-10">
        <header className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--fa-accent)]/10 text-[var(--fa-accent)]">
              <Tags className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{label}</h1>
              <p className="text-sm text-[var(--fa-text-secondary)]">
                {loading ? (
                  <Skeleton className="inline-block h-4 w-32 align-middle" />
                ) : (
                  <>
                    {(data?.technology.count ?? 0).toLocaleString()} of {index.stats.valid.toLocaleString()} portfolios
                  </>
                )}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--fa-text-secondary)]">
            {blurb ?? `Portfolios whose supplied role text matches the ${label} classification rules.`} Labels come only
            from role text in the source repository —{" "}
            <a href="#/methodology" className="text-[var(--fa-accent)] hover:underline">
              methodology
            </a>
            .
          </p>

          {data && data.related.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xs font-medium uppercase tracking-wide text-[var(--fa-text-secondary)]">
                Often appears together
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.related.map((t) => (
                  <TechnologyChip key={t.slug} label={`${t.label} · ${t.count}`} href={`#/technologies/${t.slug}`} />
                ))}
              </div>
            </div>
          )}
        </header>
      </div>

      <DirectoryView index={index} route={route} hideHeading />
    </div>
  );
}
