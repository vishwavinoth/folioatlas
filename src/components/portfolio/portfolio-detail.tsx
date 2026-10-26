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
  Link2,
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
import { SiteTile } from "@/components/preview/site-tile";
import { PreviewDialog } from "@/components/preview/preview-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NotFoundState, ErrorState } from "@/components/feedback/states";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Profile URL for the current deployment (share/copy target). */
function profileUrl(slug: string): string {
  return `${window.location.origin}${window.location.pathname}#/portfolio/${slug}`;
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
  const canGenerate = !generating && (!summary || true); // refresh always allowed (rate-limited server-side)

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
      }
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl(slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const share = async () => {
    const url = profileUrl(slug);
    if (typeof navigator.share === "function" && portfolio) {
      try {
        await navigator.share({ title: `${portfolio.name} — FolioAtlas`, url });
        return;
      } catch {
        /* user cancelled → fall through to clipboard */
      }
    }
    copyLink();
  };

  // Document metadata + JSON-LD for the profile (best-effort in a hash-routed SPA).
  useEffect(() => {
    if (!portfolio) return;
    document.title = `${portfolio.name} — Developer Portfolio | FolioAtlas`;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (selector.includes("property=")) el.setAttribute("property", selector.replace(/.*property="(.*?)".*/, "$1"));
        else el.setAttribute("name", selector.replace(/.*name="(.*?)".*/, "$1"));
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', "content", `${portfolio.name}'s developer portfolio${portfolio.role ? ` — ${portfolio.role}` : ""}. Discover more real developer portfolios on FolioAtlas.`);
    setMeta('meta[property="og:title"]', "content", `${portfolio.name} — Developer Portfolio | FolioAtlas`);
    setMeta('meta[property="og:url"]', "content", profileUrl(portfolio.slug));

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "fa-profile-jsonld";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: {
        "@type": "Person",
        name: portfolio.name,
        url: portfolio.portfolioUrl,
        ...(portfolio.githubProfileUrl ? { sameAs: [portfolio.githubProfileUrl] } : {}),
        ...(portfolio.role ? { description: portfolio.role } : {}),
        ...(portfolio.technologies.length > 0 ? { knowsAbout: portfolio.technologies.map(technologyLabel) } : {}),
      },
    });
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [portfolio]);

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
        href="#/portfolios"
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
            <Button variant="outline" asChild>
              <a href={portfolio.portfolioUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                Visit website
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              Preview
            </Button>
            <Button variant="ghost" onClick={share}>
              <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Share
            </Button>
            <Button variant="ghost" onClick={copyLink} aria-label="Copy profile link">
              {copied ? <Check className="h-4 w-4 text-[var(--fa-success)]" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
              <span className="sr-only">Copy profile link</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* Preview */}
          <section aria-labelledby="preview-heading">
            <h2 id="preview-heading" className="text-[15px] font-semibold tracking-tight">
              Website preview
            </h2>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="mt-2 block w-full text-left"
              aria-label={`Open larger preview of ${portfolio.name}'s website`}
            >
              <SiteTile url={portfolio.portfolioUrl} label={portfolio.name} className="transition-shadow hover:shadow-md" />
            </button>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="truncate text-xs text-[var(--fa-text-secondary)]">{portfolio.portfolioUrl}</span>
              <a
                href={portfolio.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--fa-accent)] hover:underline"
              >
                Open in new tab
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </section>

          {/* AI summary */}
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

          {/* Technologies */}
          {portfolio.technologies.length > 0 && (
            <section aria-labelledby="tech-heading">
              <h2 id="tech-heading" className="text-[15px] font-semibold tracking-tight">
                Focus areas
              </h2>
              <p className="mt-1 text-xs text-[var(--fa-text-secondary)]">
                Derived transparently from the role text supplied upstream —{" "}
                <a href="#/methodology" className="text-[var(--fa-accent)] hover:underline">
                  see methodology
                </a>
                .
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {portfolio.technologies.map((slug) => (
                  <TechnologyChip key={slug} label={technologyLabel(slug)} href={`#/technologies/${slug}`} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Metadata column */}
        <aside className="lg:col-span-2">
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
