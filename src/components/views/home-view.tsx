"use client";

import { BadgeCheck, ExternalLink, ShieldCheck, Tags } from "lucide-react";
import type { ClientIndex } from "@/lib/portfolio/types";
import { GlassSearchField } from "@/components/search/glass-search-field";
import { PortfolioCard } from "@/components/directory/portfolio-card";
import { TechnologyChip } from "@/components/directory/technology-chip";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Deterministic, evenly-spaced sample across the alphabet (no fake "featured"). */
function samplePortfolios(portfolios: ClientIndex["portfolios"], count: number) {
  if (portfolios.length <= count) return portfolios;
  const step = portfolios.length / count;
  return Array.from({ length: count }, (_, i) => portfolios[Math.floor(i * step)]);
}

export function HomeView({ index }: { index: ClientIndex }) {
  const syncedDate = new Date(index.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const preview = samplePortfolios(index.portfolios, 8);
  const topTechnologies = index.technologies.slice(0, 10);

  return (
    <div className="motion-fade-in">
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pb-10 pt-10 text-center sm:pt-16">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--surface-border)] bg-black/[0.03] px-3 py-1 text-xs font-medium text-[var(--fa-text-secondary)] dark:bg-white/[0.05]">
          <BadgeCheck className="h-3.5 w-3.5 text-[var(--fa-accent)]" aria-hidden="true" />
          {index.stats.valid.toLocaleString()} real portfolios · open-source data · synced {syncedDate}
        </p>
        <h1 className="text-balance mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
          Find your next developer portfolio inspiration.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-[var(--fa-text-secondary)] sm:text-base">
          Explore real developer portfolios collected from an open-source community directory. Search by name,
          domain, or primary focus area — then visit the original site.
        </p>

        <div className="mx-auto mt-7 max-w-xl">
          <GlassSearchField
            value=""
            size="lg"
            onChange={(q) => {
              window.location.hash = q ? `#/portfolios?q=${encodeURIComponent(q)}` : "#/portfolios";
            }}
            placeholder="Try “react”, “flutter”, or a developer’s name…"
            label="Search the directory"
            id="home-search"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#/portfolios"
            className="inline-flex h-11 items-center rounded-full bg-[var(--fa-accent)] px-6 text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-[var(--fa-accent-strong)]"
          >
            Explore portfolios
          </a>
          <a
            href="#/technologies"
            className="glass-clear inline-flex h-11 items-center rounded-full px-6 text-[15px] font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
          >
            Browse technologies
          </a>
        </div>
      </section>

      {/* Directory preview */}
      <section aria-labelledby="preview-heading" className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="preview-heading" className="text-xl font-semibold tracking-tight">
              From the directory
            </h2>
            <p className="mt-1 text-sm text-[var(--fa-text-secondary)]">
              A deterministic sample spanning the whole alphabet — refresh-free, no editorial picks.
            </p>
          </div>
          <a
            href="#/portfolios"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-[var(--fa-accent)] hover:underline sm:inline-flex"
          >
            View all
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {preview.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      </section>

      {/* Browse by letter */}
      <section aria-labelledby="letters-heading" className="mx-auto max-w-5xl px-4 py-8">
        <h2 id="letters-heading" className="text-xl font-semibold tracking-tight">
          Browse alphabetically
        </h2>
        <p className="mt-1 text-sm text-[var(--fa-text-secondary)]">
          Jump straight to the letter you’re interested in.
        </p>
        <nav aria-label="Browse alphabetically" className="mt-4">
          <ul className="flex flex-wrap gap-1.5">
            {LETTERS.map((letter) => {
              const lower = letter.toLowerCase();
              return (
                <li key={letter}>
                  <a
                    href={`#/portfolios/letter/${lower}`}
                    className="surface-card motion-lift flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition-colors hover:text-[var(--fa-accent)]"
                    aria-label={`Portfolios starting with ${letter}`}
                  >
                    {letter}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </section>

      {/* Browse by focus area */}
      <section aria-labelledby="tech-heading" className="mx-auto max-w-5xl px-4 py-8">
        <h2 id="tech-heading" className="text-xl font-semibold tracking-tight">
          Browse by primary focus area
        </h2>
        <p className="mt-1 text-sm text-[var(--fa-text-secondary)]">
          Categories are derived transparently from role labels supplied in the source repository —{" "}
          <a href="#/methodology" className="text-[var(--fa-accent)] hover:underline">
            see the methodology
          </a>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {topTechnologies.map((tech) => (
            <TechnologyChip key={tech.slug} label={tech.label} count={tech.count} href={`#/technologies/${tech.slug}`} />
          ))}
          <TechnologyChip label="All focus areas" href="#/technologies" />
        </div>
      </section>

      {/* Source transparency */}
      <section aria-labelledby="trust-heading" className="mx-auto max-w-5xl px-4 py-8 pb-12">
        <h2 id="trust-heading" className="text-xl font-semibold tracking-tight">
          Grounded in open data
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--fa-text-secondary)]">
          Every entry links back to the upstream repository. Invalid URLs are quarantined, duplicates are reported,
          and classification rules are published — nothing about the directory is fabricated.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ExternalLink,
              title: "Canonical source",
              body: `Entries come from the ${index.source.repository} repository, kept in sync with the exact commit shown in the footer.`,
              href: "#/methodology",
              link: "How syncing works",
            },
            {
              icon: ShieldCheck,
              title: "Validated URLs",
              body: "Only safe HTTP(S) links pass validation. Unsafe schemes, credential-embedded or private URLs are rejected and reported.",
              href: "#/methodology",
              link: "Validation rules",
            },
            {
              icon: Tags,
              title: "Transparent classification",
              body: `Focus-area labels are derived only from role text supplied upstream — ${index.stats.classified.toLocaleString()} of ${index.stats.valid.toLocaleString()} entries are classified, the rest stay untagged.`,
              href: "#/methodology",
              link: "Classification rules",
            },
          ].map(({ icon: Icon, title, body, href, link }) => (
            <div key={title} className="surface-card rounded-2xl p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--fa-accent)]/10 text-[var(--fa-accent)]">
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-[15px] font-semibold">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--fa-text-secondary)]">{body}</p>
              <a href={href} className="mt-2.5 inline-block text-[13px] font-medium text-[var(--fa-accent)] hover:underline">
                {link}
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
