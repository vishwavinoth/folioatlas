"use client";

import { ArrowUpRight, Tags } from "lucide-react";
import type { ClientIndex } from "@/lib/portfolio/types";
import { CLASSIFICATION_RULES } from "@/lib/portfolio/classify";

export function TechnologiesView({ index }: { index: ClientIndex }) {
  const coverage = Math.round((index.stats.classified / Math.max(1, index.stats.valid)) * 100);

  return (
    <div className="motion-fade-in mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:pt-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Browse by primary focus area</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fa-text-secondary)]">
          Categories are derived deterministically from the role labels supplied in the upstream repository — never
          guessed from URLs. {index.stats.classified.toLocaleString()} of {index.stats.valid.toLocaleString()} entries
          ({coverage}%) carry at least one label; the rest appear in the general directory only.
        </p>
      </header>

      <ul className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {index.technologies.map((tech) => {
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
