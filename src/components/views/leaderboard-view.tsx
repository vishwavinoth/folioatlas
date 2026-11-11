"use client";

import { ChevronLeft, ChevronRight, Eye, Heart, MousePointerClick, Trophy, User } from "lucide-react";
import type { LeaderboardItem, LeaderboardResponse } from "@/lib/api-types";
import { useApi } from "@/hooks/use-api";
import { buildHref, type Route } from "@/lib/router/router";
import { leaderboardApiUrl } from "@/lib/router/api-urls";
import { PERIOD_LABELS, PERIODS, parseMetric, parsePeriod, type Metric, type Period } from "@/lib/engagement/period";
import { technologyLabel } from "@/lib/portfolio/classify";
import { compactCount } from "@/lib/engagement/client";
import { LikeButton } from "@/components/engagement/like-button";
import { TechnologyChip } from "@/components/directory/technology-chip";
import { ErrorState } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/skeleton";

const RANK_TONES = [
  "bg-amber-400/15 text-amber-600 ring-amber-400/40 dark:text-amber-300",
  "bg-slate-400/15 text-slate-600 ring-slate-400/40 dark:text-slate-300",
  "bg-orange-500/15 text-orange-700 ring-orange-500/40 dark:text-orange-300",
];

function href(period: Period, metric: Metric, date?: string | null) {
  return buildHref("/leaderboard", {
    period: period === "weekly" ? null : period,
    metric: metric === "likes" ? null : metric,
    date: date ?? null,
  });
}

function Row({ item, metric }: { item: LeaderboardItem; metric: Metric }) {
  const p = item.portfolio;
  const tone = RANK_TONES[item.rank - 1];
  const stat = (Icon: typeof Heart, value: number, label: string, primary: boolean) => (
    <div
      className={`flex w-14 flex-col items-center justify-center rounded-xl border py-1.5 sm:w-16 ${
        primary ? "border-[var(--fa-accent)]/30 bg-[var(--fa-accent)]/[0.06]" : "border-[var(--surface-border)]"
      }`}
      title={`${value} ${label}`}
    >
      <Icon className={`h-3.5 w-3.5 ${primary ? "text-[var(--fa-accent)]" : "text-[var(--fa-text-secondary)]"}`} aria-hidden="true" />
      <span className="mt-0.5 text-sm font-semibold tabular-nums">{compactCount(value)}</span>
      <span className="sr-only">{label}</span>
    </div>
  );

  return (
    <li className="surface-card flex items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
          tone ? `ring-1 ${tone}` : "text-[var(--fa-text-secondary)]"
        }`}
        aria-label={`Rank ${item.rank}`}
      >
        {item.rank <= 3 ? <Trophy className="h-4 w-4" aria-hidden="true" /> : item.rank}
      </span>
      <span className="hidden h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--fa-accent)]/10 text-[var(--fa-accent)] sm:flex">
        {p.avatarUrl ? (
          <img src={p.avatarUrl} alt="" loading="lazy" className="h-11 w-11 object-cover" />
        ) : (
          <User className="h-5 w-5" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-semibold">
          <a href={`/portfolio/${p.slug}`} className="hover:text-[var(--fa-accent)]">
            {item.rank <= 3 && <span className="sr-only">Rank {item.rank}: </span>}
            {p.name}
          </a>
        </h2>
        {p.role && <p className="truncate text-[13px] text-[var(--fa-text-secondary)]">{p.role}</p>}
        {p.technologies.length > 0 && (
          <div className="mt-1.5 hidden flex-wrap gap-1.5 sm:flex">
            {p.technologies.slice(0, 3).map((slug) => (
              <TechnologyChip key={slug} label={technologyLabel(slug)} href={`/technologies/${slug}`} />
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {stat(Eye, item.views, "views this period", metric === "views")}
        {stat(Heart, item.likes, "likes this period", metric === "likes")}
        <LikeButton slug={p.slug} name={p.name} variant="icon" className="hidden sm:inline-flex" />
      </div>
    </li>
  );
}

/**
 * Leaderboard (Product Hunt style): portfolios ranked by likes (or views)
 * from FolioAtlas visitors within a day, ISO week, month, year or all time.
 */
export function LeaderboardView({ route }: { route: Route }) {
  const period = parsePeriod(route.query.get("period"));
  const metric = parseMetric(route.query.get("metric"));
  const { data, loading, error, refetch } = useApi<LeaderboardResponse>(leaderboardApiUrl(route));

  return (
    <div className="motion-fade-in mx-auto w-full max-w-4xl px-4 pb-12 pt-8 sm:pt-10">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          <Trophy className="h-6 w-6 text-amber-500" aria-hidden="true" />
          Portfolio Leaderboard
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
          The developer portfolios FolioAtlas visitors liked and viewed most — ranked daily, weekly, monthly, yearly and
          all time.
        </p>
      </header>

      {/* Period + metric */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Leaderboard period" className="grid grid-cols-5 gap-1 sm:flex">
          {PERIODS.map((p) => (
            <a
              key={p}
              href={href(p, metric)}
              aria-current={p === period ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full px-1 py-1.5 text-center text-[13px] font-medium transition-colors sm:px-3.5 sm:text-sm ${
                p === period
                  ? "bg-[var(--fa-accent)] text-white shadow-sm"
                  : "text-[var(--fa-text-secondary)] hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]"
              }`}
            >
              {PERIOD_LABELS[p]}
            </a>
          ))}
        </nav>
        <div role="group" aria-label="Rank by" className="glass-clear flex shrink-0 self-start rounded-full p-1 text-sm sm:self-auto">
          {(["likes", "views"] as const).map((m) => (
            <a
              key={m}
              href={href(period, m, data?.date)}
              aria-current={m === metric ? "true" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
                m === metric ? "bg-background text-foreground shadow-sm" : "text-[var(--fa-text-secondary)] hover:text-foreground"
              }`}
            >
              {m === "likes" ? <Heart className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
              {m === "likes" ? "Most liked" : "Most viewed"}
            </a>
          ))}
        </div>
      </div>

      {/* Date navigation */}
      {period !== "all" && (
        <div className="surface-card mt-4 rounded-2xl p-2">
          <div className="flex items-center justify-between gap-2">
            {data?.prev ? (
              <a
                href={href(period, metric, data.prev)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--fa-text-secondary)] transition-colors hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]"
                aria-label="Previous period"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </a>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center text-[var(--fa-text-secondary)]/40" aria-hidden="true">
                <ChevronLeft className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 text-center" aria-live="polite">
              <p className="truncate text-[15px] font-semibold">{data?.label ?? " "}</p>
              <p className="truncate text-xs text-[var(--fa-text-secondary)]">{data?.range ?? " "} · UTC</p>
            </div>
            {data?.next ? (
              <a
                href={href(period, metric, data.next)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--fa-text-secondary)] transition-colors hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]"
                aria-label="Next period"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </a>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center text-[var(--fa-text-secondary)]/40" aria-hidden="true">
                <ChevronRight className="h-5 w-5" />
              </span>
            )}
          </div>
          {data && data.strip.length > 0 && (
            <nav aria-label="Jump to date" className="fa-scroll mt-2 flex gap-1 overflow-x-auto border-t border-[var(--surface-border)] px-1 pt-2">
              {data.strip.map((s) =>
                s.disabled ? (
                  <span key={s.date} className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs tabular-nums text-[var(--fa-text-secondary)]/40">
                    {s.label}
                  </span>
                ) : (
                  <a
                    key={s.date}
                    href={href(period, metric, s.date)}
                    aria-current={s.active ? "date" : undefined}
                    className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs font-medium tabular-nums transition-colors ${
                      s.active
                        ? "bg-[var(--fa-accent)]/12 text-[var(--fa-accent)] ring-1 ring-[var(--fa-accent)]/30"
                        : "text-foreground/80 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                    }`}
                  >
                    {s.label}
                  </a>
                )
              )}
            </nav>
          )}
        </div>
      )}

      {/* Results */}
      <div className="mt-5">
        {error ? (
          <ErrorState title="Couldn't load the leaderboard" detail="Please try again in a moment." onRetry={refetch} />
        ) : loading || !data ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading leaderboard">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[76px] rounded-2xl" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className="surface-card flex flex-col items-center rounded-3xl px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500">
              <Trophy className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No activity yet — {data.label.toLowerCase()}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--fa-text-secondary)]">
              Rankings fill in as visitors explore and like portfolios. Be the first: find one that inspires you and tap
              the heart.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <a
                href="/portfolios"
                className="inline-flex h-10 items-center rounded-full bg-[var(--fa-accent)] px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--fa-accent-strong)]"
              >
                Explore portfolios
              </a>
              {period !== "all" && (
                <a
                  href={href("all", metric)}
                  className="glass-clear inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                >
                  See all time
                </a>
              )}
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-3" aria-label={`${data.label}: ${metric === "likes" ? "most liked" : "most viewed"} portfolios`}>
            {data.items.map((item) => (
              <Row key={item.portfolio.id} item={item} metric={metric} />
            ))}
          </ol>
        )}
      </div>

      <section aria-labelledby="ranking-heading" className="mt-8 rounded-2xl border border-[var(--surface-border)] p-4 text-[13px] leading-relaxed text-[var(--fa-text-secondary)]">
        <h2 id="ranking-heading" className="flex items-center gap-1.5 font-semibold text-foreground">
          <MousePointerClick className="h-4 w-4" aria-hidden="true" />
          How ranking works
        </h2>
        <p className="mt-1.5">
          Portfolios are ranked by likes from FolioAtlas visitors in the selected period (or by views), then by the other
          metric, then by clicks through to the site. Each visitor can like a portfolio once; views and visits count once
          per visitor per day; automated traffic is excluded. Periods use UTC. Rankings reflect activity on FolioAtlas —
          not a judgement of anyone&apos;s work.
        </p>
      </section>
    </div>
  );
}
