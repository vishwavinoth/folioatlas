"use client";

import { useMemo } from "react";
import { BadgeCheck, Compass, ExternalLink, ShieldCheck, Sparkles, Tags, Users } from "lucide-react";
import type { StatsResponse } from "@/lib/api-types";
import { useApi } from "@/hooks/use-api";
import { GlassSearchField } from "@/components/search/glass-search-field";
import { PortfolioCard } from "@/components/directory/portfolio-card";
import { TechnologyChip } from "@/components/directory/technology-chip";
import { GrowthChart } from "@/components/analytics/growth-chart";
import { Skeleton } from "@/components/ui/skeleton";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function HeroStatsSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}

export function HomeView() {
  const { data, loading } = useApi<StatsResponse>("/api/stats");

  const quickFilters = useMemo(() => {
    if (!data) return [];
    return data.technologies.slice(0, 6).map((t) => ({ label: t.label, href: `#/technologies/${t.slug}` }));
  }, [data]);

  const stats = data?.stats;

  return (
    <div className="motion-fade-in">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-10 text-center sm:pt-14">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--surface-border)] bg-black/[0.03] px-3 py-1 text-xs font-medium text-[var(--fa-text-secondary)] dark:bg-white/[0.05]">
          <BadgeCheck className="h-3.5 w-3.5 text-[var(--fa-accent)]" aria-hidden="true" />
          {stats
            ? `${stats.totalPortfolios.toLocaleString()} real portfolios · verified against upstream commits`
            : "Real portfolios · verified against upstream commits"}
        </p>

        <h1 className="text-balance mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Find your next developer portfolio inspiration.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-[var(--fa-text-secondary)] sm:text-base">
          Explore a directory of real developer portfolios, synced from an open-source community repository with
          verifiable history. Search by keyword — or ask in plain language with AI search.
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

        {/* Quick filters */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {loading && quickFilters.length === 0 ? (
            <>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </>
          ) : (
            quickFilters.map((f) => (
              <a
                key={f.href}
                href={f.href}
                className="glass-clear inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-medium text-[var(--fa-text-secondary)] transition-colors hover:text-foreground"
              >
                {f.label}
              </a>
            ))
          )}
          <a
            href="#/portfolios?ai=1"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--fa-accent)]/10 px-3.5 text-[13px] font-medium text-[var(--fa-accent)] transition-colors hover:bg-[var(--fa-accent)]/15"
            title="Search with natural language"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI search
          </a>
        </div>

        {/* Verified platform stats */}
        {loading || !stats ? (
          <HeroStatsSkeleton />
        ) : (
          <dl className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Verified platform statistics">
            {[
              { label: "Portfolios indexed", value: stats.totalPortfolios.toLocaleString(), hint: `first entry ${fmtDate(stats.firstEntryAt)}` },
              { label: "Focus areas", value: String(stats.technologyCount), hint: "canonical, transparently derived" },
              { label: "With role text", value: stats.withRoleText.toLocaleString(), hint: "supplied by the source" },
              { label: "Last successful sync", value: fmtDate(stats.lastSyncAt), hint: stats.lastSyncCommit ? `commit ${stats.lastSyncCommit.slice(0, 7)}` : "" },
            ].map((s) => (
              <div key={s.label} className="surface-card rounded-xl px-3.5 py-3 text-left">
                <dt className="order-2 text-[11px] font-medium text-[var(--fa-text-secondary)]">{s.label}</dt>
                <dd className="order-1 text-lg font-semibold tracking-tight" title={s.hint}>
                  {s.value}
                </dd>
                <dd className="order-3 truncate text-[10px] text-[var(--fa-text-secondary)]">{s.hint}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* ── Portfolio Growth ─────────────────────────────────────────────── */}
      <section aria-labelledby="growth-heading" className="mx-auto max-w-5xl px-4 py-6">
        <h2 id="growth-heading" className="sr-only">
          Directory growth over time
        </h2>
        <GrowthChart initialRange="1y" />
      </section>

      {/* ── Recently added (verified first-seen) ─────────────────────────── */}
      <section aria-labelledby="recent-heading" className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="recent-heading" className="text-xl font-semibold tracking-tight">
              Recently added portfolios
            </h2>
            <p className="mt-1 text-sm text-[var(--fa-text-secondary)]">
              Dates come from the first upstream commit that contained each entry — verifiable, not estimated.
            </p>
          </div>
          <a
            href="#/portfolios?sort=newest"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-[var(--fa-accent)] hover:underline sm:inline-flex"
          >
            Browse newest
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading || !data
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)
            : data.recentlyAdded.slice(0, 8).map((p) => <PortfolioCard key={p.id} portfolio={p} />)}
        </div>
      </section>

      {/* ── Curated collections ──────────────────────────────────────────── */}
      <section aria-labelledby="collections-heading" className="mx-auto max-w-5xl px-4 py-8">
        <h2 id="collections-heading" className="text-xl font-semibold tracking-tight">
          Curated collections
        </h2>
        <p className="mt-1 text-sm text-[var(--fa-text-secondary)]">
          Groupings of focus areas — every count is a real union over the indexed directory.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading || !data
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
            : data.collections.map((c) => (
                <a
                  key={c.slug}
                  href={`#/collections/${c.slug}`}
                  className="surface-card motion-lift group rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[15px] font-semibold">{c.label}</h3>
                    <span className="shrink-0 rounded-full bg-[var(--fa-accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--fa-accent)]">
                      {c.count.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--fa-text-secondary)]">{c.description}</p>
                </a>
              ))}
        </div>
      </section>

      {/* ── Featured developers (transparent criteria) ───────────────────── */}
      <section aria-labelledby="featured-heading" className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="featured-heading" className="flex items-center gap-1.5 text-xl font-semibold tracking-tight">
              <Users className="h-5 w-5 text-[var(--fa-accent)]" aria-hidden="true" />
              Featured developers
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--fa-text-secondary)]">
              Transparent, deterministic criteria: supplied role text, at least two verified focus areas, and a
              github.io portfolio whose GitHub identity can be checked. Not editorial picks.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading || !data
            ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)
            : data.featured.map((p) => <PortfolioCard key={p.id} portfolio={p} />)}
        </div>
      </section>

      {/* ── Explore all ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="surface-card flex flex-col items-center gap-4 rounded-2xl px-6 py-8 text-center">
          <Compass className="h-8 w-8 text-[var(--fa-accent)]" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Explore all portfolios</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--fa-text-secondary)]">
              Browse the complete directory with keyword search, AI search, advanced filters and sorting.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
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
        </div>
      </section>

      {/* ── Browse alphabetically ────────────────────────────────────────── */}
      <section aria-labelledby="letters-heading" className="mx-auto max-w-5xl px-4 py-8">
        <h2 id="letters-heading" className="text-xl font-semibold tracking-tight">
          Browse alphabetically
        </h2>
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

      {/* ── Source transparency ──────────────────────────────────────────── */}
      <section aria-labelledby="trust-heading" className="mx-auto max-w-5xl px-4 py-8 pb-12">
        <h2 id="trust-heading" className="text-xl font-semibold tracking-tight">
          Grounded in open data
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--fa-text-secondary)]">
          Every entry links back to the upstream repository. Invalid URLs are quarantined, duplicates are reported,
          growth history is derived from verifiable commits, and AI outputs are clearly labeled — nothing about the
          directory is fabricated.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ExternalLink,
              title: "Canonical source",
              body: `Entries come from the ${stats?.lastSyncCommit ? "upstream repository pinned to the exact commit shown in the footer" : "upstream repository"}, kept in sync with verifiable commit provenance.`,
              href: "#/methodology",
              link: "How syncing works",
            },
            {
              icon: ShieldCheck,
              title: "Verified history",
              body: `Growth charts use ${stats?.historySnapshotCount.toLocaleString() ?? "recorded"} snapshots derived from real upstream commits and successful syncs — never from a single generated report.`,
              href: "#/methodology",
              link: "Data provenance",
            },
            {
              icon: Tags,
              title: "Labeled AI features",
              body: `${stats?.aiSummaryCount.toLocaleString() ?? "0"} AI summaries stored so far. Every AI output is labeled as such, grounded only in source data, and falls back gracefully.`,
              href: "#/methodology",
              link: "AI guardrails",
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
