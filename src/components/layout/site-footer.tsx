"use client";

import { Compass, ExternalLink, Github } from "lucide-react";
import type { ClientIndex } from "@/lib/portfolio/types";
import { CREATOR } from "@/lib/site/creator";

export function SiteFooter({ index }: { index: ClientIndex }) {
  const synced = new Date(index.generatedAt);
  const syncedLabel = synced.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <footer className="fa-footer-safe mt-auto border-t border-[var(--surface-border)] bg-[var(--surface)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--fa-accent)] text-white">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              FolioAtlas
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--fa-text-secondary)]">
              One beautiful place to discover real developer portfolios. All entries are sourced from an
              open-source community repository — nothing here is invented.
            </p>
            <p className="mt-3 text-[13px] text-[var(--fa-text-secondary)]">
              Built by{" "}
              <a
                className="font-medium text-foreground transition-colors hover:text-[var(--fa-accent)]"
                href={CREATOR.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {CREATOR.name}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`https://github.com/${index.source.repository}/blob/${index.source.branch}/CONTRIBUTING.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1 rounded-full bg-[var(--fa-accent)] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[var(--fa-accent-strong)]"
              >
                Add your portfolio
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">(opens the upstream repository in a new tab)</span>
              </a>
              <a
                href={CREATOR.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--surface-border)] px-3.5 text-xs font-medium text-foreground/80 transition-colors hover:text-[var(--fa-accent)]"
              >
                <Github className="h-3.5 w-3.5" aria-hidden="true" />
                {CREATOR.contactLabel}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--fa-text-secondary)]">Directory</h2>
              <ul className="mt-3 space-y-2">
                <li><a className="text-foreground/80 transition-colors hover:text-[var(--fa-accent)]" href="/portfolios">All portfolios</a></li>
                <li><a className="text-foreground/80 transition-colors hover:text-[var(--fa-accent)]" href="/technologies">Focus areas</a></li>
                <li><a className="text-foreground/80 transition-colors hover:text-[var(--fa-accent)]" href="/portfolios/letter/a">Browse A–Z</a></li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--fa-text-secondary)]">Project</h2>
              <ul className="mt-3 space-y-2">
                <li><a className="text-foreground/80 transition-colors hover:text-[var(--fa-accent)]" href="/about">About</a></li>
                <li><a className="text-foreground/80 transition-colors hover:text-[var(--fa-accent)]" href="/methodology">Methodology</a></li>
                <li><a className="text-foreground/80 transition-colors hover:text-[var(--fa-accent)]" href="/privacy">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--fa-text-secondary)]">Data source</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-[var(--fa-accent)]"
                    href={`https://github.com/${index.source.repository}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-3.5 w-3.5" aria-hidden="true" />
                    {index.source.repository}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </li>
                <li>
                  <a
                    className="text-foreground/80 transition-colors hover:text-[var(--fa-accent)]"
                    href={`https://github.com/${index.source.repository}/commit/${index.source.commit ?? ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Synced {syncedLabel}
                    <span className="sr-only"> — view the exact source commit (opens in a new tab)</span>
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-[var(--surface-border)] pt-5 text-xs text-[var(--fa-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            {index.stats.valid.toLocaleString()} portfolios · data synced {syncedLabel}
            {index.source.commit ? (
              <>
                {" "}· commit{" "}
                <code className="rounded bg-black/[0.05] px-1 py-0.5 font-mono text-[11px] dark:bg-white/[0.07]">
                  {index.source.commit.slice(0, 7)}
                </code>
              </>
            ) : null}
          </p>
          <p>
            Data by the{" "}
            <a
              className="underline decoration-[var(--surface-border)] underline-offset-2 transition-colors hover:text-[var(--fa-accent)]"
              href={`https://github.com/${index.source.repository}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {index.source.repository}
            </a>{" "}
            community. FolioAtlas is an independent project — not affiliated with or endorsed by Apple or the upstream maintainers.
          </p>
        </div>
      </div>
    </footer>
  );
}
