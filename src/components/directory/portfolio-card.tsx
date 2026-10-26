"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import type { PortfolioBase as Portfolio } from "@/lib/portfolio/types";
import { technologyLabel } from "@/lib/portfolio/classify";
import { TechnologyChip } from "./technology-chip";

function prettyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function PortfolioCard({ portfolio }: { portfolio: Portfolio }) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(portfolio.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard may be unavailable — the open action still works.
    }
  };

  const host = prettyHost(portfolio.url);

  return (
    <article className="surface-card motion-lift group relative flex h-full flex-col rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-[15px] font-semibold leading-snug">
          <a
            href={portfolio.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-offset-4"
          >
            <span className="truncate">{portfolio.name}</span>
            <span className="sr-only"> — opens in a new tab</span>
          </a>
        </h3>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-[var(--fa-text-secondary)] opacity-50 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>

      <p className="mt-0.5 truncate text-[13px] text-[var(--fa-text-secondary)]" title={portfolio.url}>
        {host}
      </p>

      {portfolio.description && (
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--fa-text-secondary)]">
          {portfolio.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
        {(portfolio.technologies ?? []).slice(0, 3).map((slug) => (
          <TechnologyChip key={slug} label={technologyLabel(slug)} />
        ))}
        {(portfolio.technologies?.length ?? 0) > 3 && (
          <TechnologyChip label={`+${portfolio.technologies!.length - 3}`} />
        )}
        <button
          type="button"
          onClick={copyUrl}
          className="relative z-10 ml-auto flex h-7 w-7 items-center justify-center rounded-full text-[var(--fa-text-secondary)] transition-colors hover:bg-black/[0.06] hover:text-foreground dark:hover:bg-white/[0.08]"
          aria-label={`Copy link for ${portfolio.name}`}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[var(--fa-success)]" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </div>
    </article>
  );
}
