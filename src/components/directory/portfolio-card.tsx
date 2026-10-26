"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, Eye, Sparkles, User } from "lucide-react";
import type { WirePortfolio } from "@/lib/api-types";
import { technologyLabel } from "@/lib/portfolio/classify";
import { TechnologyChip } from "./technology-chip";
import { PreviewImage } from "@/components/preview/preview-image";
import { PreviewDialog } from "@/components/preview/preview-dialog";

function prettyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Portfolio card (PRD §2). Every card shows verified data only:
 * identity (avatar or initials fallback), GitHub attribution (labeled when
 * inferred from a github.io domain), the site preview (or its explicit
 * unavailable state), the AI summary when one exists, and three honest
 * actions: details, in-page preview, open-in-new-tab.
 */
export function PortfolioCard({ portfolio }: { portfolio: WirePortfolio }) {
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const host = prettyHost(portfolio.portfolioUrl);
  const initials = portfolio.name.slice(0, 2).toUpperCase();

  const copyLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}#/portfolio/${portfolio.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — the detail page still offers the URL.
    }
  };

  return (
    <article className="surface-card motion-lift group relative flex h-full flex-col rounded-2xl p-4">
      {/* Preview */}
      <PreviewImage slug={portfolio.slug} url={portfolio.portfolioUrl} label={portfolio.name} className="mb-3" />

      {/* Identity */}
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--fa-accent)]/10 text-xs font-semibold text-[var(--fa-accent)]">
          {portfolio.avatarUrl ? (
            <img
              src={portfolio.avatarUrl}
              alt=""
              loading="lazy"
              className="h-9 w-9 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <User className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-snug">
            <a
              href={`#/portfolio/${portfolio.slug}`}
              className="rounded-sm focus-visible:outline-offset-4"
              title={`View details for ${portfolio.name}`}
            >
              {portfolio.name}
            </a>
          </h3>
          <p className="truncate text-[13px] text-[var(--fa-text-secondary)]" title={portfolio.portfolioUrl}>
            {host}
          </p>
        </div>
        {portfolio.hasAiSummary && (
          <span
            className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--fa-accent)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--fa-accent)]"
            title="This entry has an AI-generated summary"
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            AI
          </span>
        )}
      </div>

      {/* Role / description (verbatim upstream text) */}
      {portfolio.role && (
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--fa-text-secondary)]" title={portfolio.role}>
          {portfolio.role}
        </p>
      )}

      {/* AI summary snippet (labeled) */}
      {portfolio.aiSummary && (
        <p className="mt-2 line-clamp-2 rounded-lg bg-[var(--fa-accent)]/[0.06] px-2.5 py-1.5 text-[12px] leading-relaxed text-[var(--fa-text-secondary)]">
          <span className="font-medium text-[var(--fa-accent)]">AI summary: </span>
          {portfolio.aiSummary.summary}
        </p>
      )}

      {/* Tags */}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
        {portfolio.technologies.slice(0, 3).map((slug) => (
          <TechnologyChip key={slug} label={technologyLabel(slug)} href={`#/technologies/${slug}`} />
        ))}
        {portfolio.technologies.length > 3 && (
          <TechnologyChip label={`+${portfolio.technologies.length - 3}`} />
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--surface-border)] pt-3">
        <a
          href={`#/portfolio/${portfolio.slug}`}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-[var(--fa-accent)]/10 px-3 text-xs font-medium text-[var(--fa-accent)] transition-colors hover:bg-[var(--fa-accent)]/15"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          Details
        </a>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--surface-border)] px-3 text-xs font-medium text-[var(--fa-text-secondary)] transition-colors hover:text-foreground"
        >
          Preview
        </button>
        <a
          href={portfolio.portfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--surface-border)] px-3 text-xs font-medium text-[var(--fa-text-secondary)] transition-colors hover:text-foreground"
        >
          Open
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="relative z-10 ml-auto flex h-8 w-8 items-center justify-center rounded-full text-[var(--fa-text-secondary)] transition-colors hover:bg-black/[0.06] hover:text-foreground dark:hover:bg-white/[0.08]"
          aria-label={`Copy profile link for ${portfolio.name}`}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[var(--fa-success)]" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        url={portfolio.portfolioUrl}
        label={portfolio.name}
      />
    </article>
  );
}
