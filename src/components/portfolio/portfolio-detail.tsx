"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CalendarClock,
  Copy,
  ExternalLink,
  Eye,
  Github,
  Globe,
  Heart,
  MousePointerClick,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import type { AiSummaryWire, DetailResponse } from "@/lib/api-types";
import { useApi } from "@/hooks/use-api";
import { technologyLabel } from "@/lib/portfolio/classify";
import { TechnologyChip } from "@/components/directory/technology-chip";
import { PortfolioCard } from "@/components/directory/portfolio-card";
import { useFeatures } from "@/lib/features/context";
import { LikeButton } from "@/components/engagement/like-button";
import { compactCount, track, useEngagement } from "@/lib/engagement/client";
import { copyWithToast, toast } from "@/lib/notify";
import { PreviewDialog } from "@/components/preview/preview-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NotFoundState, ErrorState } from "@/components/feedback/states";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
}

function prettyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Profile URL for the current deployment (share/copy target). */
function profileUrl(slug: string): string {
  return `${window.location.origin}/portfolio/${slug}`;
}

export function PortfolioDetail({ slug }: { slug: string }) {
  const { data, loading, error, refetch } = useApi<DetailResponse>(`/api/portfolios/${slug}`);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summaryOverride, setSummaryOverride] = useState<AiSummaryWire | null>(null);

  const portfolio = data?.portfolio ?? null;

  // Regenerate is offered when no complete summary exists or the user asks
  // for a refresh; result replaces the local view immediately.
  const summary = summaryOverride ?? portfolio?.aiSummary ?? null;
  // Generation needs a configured AI provider; refresh is rate-limited server-side.
  const { ai: canGenerate, engagement } = useFeatures();
  const counts = useEngagement(slug, engagement);

  // One view per visitor per day is counted server-side; bots are ignored.
  useEffect(() => {
    if (engagement && portfolio) track(slug, "view");
  }, [engagement, portfolio, slug]);
  const onVisit = () => {
    if (engagement) track(slug, "visit");
  };

  const generateSummary = async () => {
    if (!portfolio) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/summaries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: portfolio.slug }),
      });
      if (res.ok) {
        const json = (await res.json()) as { summary: AiSummaryWire | null };
        if (json.summary) setSummaryOverride(json.summary);
        toast.success("AI summary generated");
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string; retryAfterSeconds?: number };
        const description =
          body.error === "rate-limited"
            ? `Too many requests — try again in ${body.retryAfterSeconds ?? 60} seconds.`
            : body.error === "insufficient-source-data"
              ? "This entry has no role text or focus areas to summarize from."
              : "The AI service is unavailable right now. Please try again later.";
        toast.error("Couldn't generate a summary", { description });
      }
    } catch {
      toast.error("Couldn't generate a summary", { description: "Check your connection and try again." });
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (await copyWithToast(profileUrl(slug), "Profile link copied")) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const share = async () => {
    const url = profileUrl(slug);
    if (typeof navigator.share === "function" && portfolio) {
      try {
        await navigator.share({ title: `${portfolio.name} — FolioAtlas`, url });
        return;
      } catch (err) {
        // The user dismissed the share sheet: do nothing. Other failures fall back to copying.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    copyLink();
  };

  const related = useMemo(() => data?.related ?? [], [data]);

  if (loading) return <DetailSkeleton />;
  if (error === "not-found") {
    return (
      <div className="px-4 py-16">
        <NotFoundState
          title="Portfolio not found"
          detail="This entry may have been removed from the upstream source, or the link is stale."
        />
      </div>
    );
  }
  if (error || !portfolio) {
    return (
      <div className="px-4 py-16">
        <ErrorState title="Could not load this profile" detail="The directory service did not respond. Please try again." onRetry={refetch} />
      </div>
    );
  }

  const initials = portfolio.name.slice(0, 2).toUpperCase();

  return (
    <div className="motion-fade-in mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:pt-10">
      <a
        href="/portfolios"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--fa-text-secondary)] transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All portfolios
      </a>

      {/* Identity header */}
      <header className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--fa-accent)]/10 text-xl font-semibold text-[var(--fa-accent)]">
          {portfolio.avatarUrl ? (
            <img src={portfolio.avatarUrl} alt={`Avatar of ${portfolio.name}`} className="h-20 w-20 object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
          ) : (
            <User className="h-8 w-8" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{portfolio.name}</h1>
          {portfolio.role && <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">{portfolio.role}</p>}

          {/* Author attribution (PRD §3 rules): the developer owns this entry;
              GitHub identity is labeled when inferred from a github.io domain. */}
          <p className="mt-2 text-xs text-[var(--fa-text-secondary)]">
            Portfolio entry listed in the open-source{" "}
            <a href="https://github.com/emmabostian/developer-portfolios" className="text-[var(--fa-accent)] hover:underline" target="_blank" rel="noopener noreferrer">
              developer-portfolios
            </a>{" "}
            directory · indexed by FolioAtlas.
            {portfolio.githubSource === "inferred-domain" && (
              <span className="ml-1" title="Derived from the github.io subdomain of the portfolio URL">
                GitHub identity inferred from the portfolio domain.
              </span>
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {portfolio.githubProfileUrl && (
              <Button asChild>
                <a href={portfolio.githubProfileUrl} target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-4 w-4" aria-hidden="true" />
                  View GitHub Profile
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Button>
            )}
            <Button asChild>
              <a href={portfolio.portfolioUrl} target="_blank" rel="noopener noreferrer" onClick={onVisit} onAuxClick={onVisit}>
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                Visit website
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
            <Button variant="outline" onClick={share}>
              {copied ? <Check className="mr-2 h-4 w-4 text-[var(--fa-success)]" aria-hidden="true" /> : <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />}
              {copied ? "Link copied" : "Share"}
            </Button>
            <LikeButton slug={slug} name={portfolio.name} variant="button" />
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* Website */}
          <section aria-labelledby="website-heading" className="surface-card rounded-2xl p-4 sm:p-5">
            <h2 id="website-heading" className="text-[15px] font-semibold tracking-tight">
              Website
            </h2>
            <div className="mt-3 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--fa-accent)]/10 text-[var(--fa-accent)]">
                <Globe className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">{prettyHost(portfolio.portfolioUrl)}</p>
                <p className="truncate text-xs text-[var(--fa-text-secondary)]" title={portfolio.portfolioUrl}>
                  {portfolio.portfolioUrl}
                </p>
                {portfolio.portfolioUrl.startsWith("http://") && (
                  <p className="mt-1 text-xs text-[var(--fa-text-secondary)]">
                    This site is listed without HTTPS; your browser may show a security warning.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Preview in page
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={portfolio.portfolioUrl} target="_blank" rel="noopener noreferrer" onClick={onVisit} onAuxClick={onVisit}>
                  Open in new tab
                  <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Button>
            </div>
          </section>

          {/* AI summary (hidden entirely when there is none and AI is not configured) */}
          {(summary || canGenerate) && (
          <section aria-labelledby="ai-heading" className="rounded-2xl border border-[var(--fa-accent)]/20 bg-[var(--fa-accent)]/[0.04] p-4 sm:p-5">
            <h2 id="ai-heading" className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
              <Sparkles className="h-4 w-4 text-[var(--fa-accent)]" aria-hidden="true" />
              AI-generated summary
              <span className="rounded-full bg-[var(--fa-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--fa-accent)]">AI</span>
            </h2>

            {summary ? (
              <>
                <p className="mt-2.5 text-sm leading-relaxed text-foreground">{summary.summary}</p>
                {summary.specialties.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Specialties grounded in the source data">
                    {summary.specialties.map((s) => (
                      <li key={s} className="rounded-full border border-[var(--surface-border)] px-2.5 py-0.5 text-[11px] text-[var(--fa-text-secondary)]">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-[var(--fa-text-secondary)]">
                  Generated by {summary.model} on {fmtDate(summary.generatedAt)} from the entry's supplied role text
                  and focus areas only. AI summaries can be imperfect — always verify on the original site.
                </p>
              </>
            ) : (
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--fa-text-secondary)]">
                {generating
                  ? "Generating a grounded summary from the entry's source data…"
                  : "No AI summary exists yet for this entry. Generate one — it is created only from the entry's supplied role text and focus areas, and is stored for reuse."}
              </p>
            )}

            {canGenerate && (
              <Button variant="outline" size="sm" className="mt-3" onClick={generateSummary} disabled={generating}>
                {generating ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="mr-2 h-3.5 w-3.5" aria-hidden="true" />}
                {summary ? "Regenerate summary" : "Generate AI summary"}
              </Button>
            )}
          </section>
          )}

          {/* Technologies */}
          {portfolio.technologies.length > 0 && (
            <section aria-labelledby="tech-heading">
              <h2 id="tech-heading" className="text-[15px] font-semibold tracking-tight">
                Focus areas
              </h2>
              <p className="mt-1 text-xs text-[var(--fa-text-secondary)]">
                Derived transparently from the role text supplied upstream —{" "}
                <a href="/methodology" className="text-[var(--fa-accent)] hover:underline">
                  see methodology
                </a>
                .
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {portfolio.technologies.map((slug) => (
                  <TechnologyChip key={slug} label={technologyLabel(slug)} href={`/technologies/${slug}`} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Metadata column */}
        <aside className="flex flex-col gap-6 lg:col-span-2">
          {engagement && (
            <section aria-labelledby="activity-heading" className="surface-card rounded-2xl p-4 sm:p-5">
              <h2 id="activity-heading" className="text-[15px] font-semibold tracking-tight">
                On FolioAtlas
              </h2>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Likes", value: counts?.likes, Icon: Heart },
                  { label: "Views", value: counts?.views, Icon: Eye },
                  { label: "Site visits", value: counts?.visits, Icon: MousePointerClick },
                ].map(({ label, value, Icon }) => (
                  <div key={label} className="rounded-xl bg-black/[0.03] px-2 py-2.5 dark:bg-white/[0.04]">
                    <dt className="flex items-center justify-center gap-1 text-[11px] text-[var(--fa-text-secondary)]">
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      {label}
                    </dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                      {value === undefined ? <Skeleton className="mx-auto h-6 w-8" /> : compactCount(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--fa-text-secondary)]">
                Anonymous, deduplicated activity from FolioAtlas visitors.{" "}
                <a href="/leaderboard" className="font-medium text-[var(--fa-accent)] hover:underline">
                  See the leaderboard
                </a>
              </p>
            </section>
          )}
          <section aria-labelledby="meta-heading" className="surface-card rounded-2xl p-4 sm:p-5">
            <h2 id="meta-heading" className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
              <ShieldCheck className="h-4 w-4 text-[var(--fa-success)]" aria-hidden="true" />
              Source &amp; verification
            </h2>
            <dl className="mt-3 flex flex-col gap-2.5 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--fa-text-secondary)]">First seen in source</dt>
                <dd className="flex items-center gap-1 font-medium">
                  <CalendarClock className="h-3.5 w-3.5 text-[var(--fa-text-secondary)]" aria-hidden="true" />
                  {fmtDate(portfolio.firstSeenAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--fa-text-secondary)]">Last verified in source</dt>
                <dd className="font-medium">{fmtDate(portfolio.lastSeenAt)}</dd>
              </div>
              {portfolio.sourceUpdatedAt && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--fa-text-secondary)]">Last updated in source</dt>
                  <dd className="font-medium">{fmtDate(portfolio.sourceUpdatedAt)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--fa-text-secondary)]">Source repository</dt>
                <dd className="truncate font-medium">
                  <a
                    href="https://github.com/emmabostian/developer-portfolios"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--fa-accent)] hover:underline"
                  >
                    developer-portfolios
                    <ArrowUpRight className="ml-0.5 inline h-3 w-3" aria-hidden="true" />
                  </a>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--fa-text-secondary)]">Section</dt>
                <dd className="font-medium">Letter {portfolio.letter}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--fa-text-secondary)]">Profile link</dt>
                <dd>
                  <button type="button" onClick={copyLink} className="inline-flex items-center gap-1 font-medium text-[var(--fa-accent)] hover:underline">
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-10">
          <h2 id="related-heading" className="text-lg font-semibold tracking-tight">
            Related portfolios
          </h2>
          <p className="mt-1 text-sm text-[var(--fa-text-secondary)]">
            Developers sharing focus areas with {portfolio.name}.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PortfolioCard key={p.id} portfolio={p} />
            ))}
          </div>
        </section>
      )}

      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={portfolio.portfolioUrl} label={portfolio.name} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:pt-10" aria-label="Loading portfolio profile">
      <Skeleton className="h-4 w-28" />
      <div className="mt-5 flex gap-5">
        <Skeleton className="h-20 w-20 rounded-2xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-40 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}
