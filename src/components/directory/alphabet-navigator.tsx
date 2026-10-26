"use client";

import type { Route } from "@/lib/router/router";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function AlphabetNavigator({
  counts,
  activeLetter,
  makeHref,
}: {
  counts: Record<string, number>;
  activeLetter: string | null;
  makeHref: (letter: string | null) => string;
}) {
  return (
    <nav aria-label="Browse portfolios alphabetically" className="glass rounded-2xl px-2 py-2">
      <div className="fa-scroll flex items-center gap-0.5 overflow-x-auto">
        <a
          href={makeHref(null)}
          aria-current={activeLetter === null ? "page" : undefined}
          className={`flex h-9 shrink-0 items-center rounded-full px-3 text-sm transition-colors ${
            activeLetter === null
              ? "bg-[var(--fa-accent)]/10 font-medium text-[var(--fa-accent)]"
              : "text-[var(--fa-text-secondary)] hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]"
          }`}
        >
          All
        </a>
        <span className="mx-1 h-5 w-px shrink-0 bg-[var(--surface-border)]" aria-hidden="true" />
        {LETTERS.map((letter) => {
          const count = counts[letter] ?? 0;
          const active = activeLetter === letter;
          if (count === 0) {
            return (
              <span
                key={letter}
                aria-disabled="true"
                aria-label={`Letter ${letter} (no portfolios)`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm text-[var(--fa-text-secondary)] opacity-40"
              >
                {letter}
              </span>
            );
          }
          return (
            <a
              key={letter}
              href={makeHref(letter)}
              aria-current={active ? "page" : undefined}
              aria-label={`Letter ${letter}, ${count} portfolios`}
              title={`${letter} · ${count}`}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm transition-colors ${
                active
                  ? "bg-[var(--fa-accent)] font-medium text-white shadow-sm"
                  : "text-[var(--fa-text-secondary)] hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]"
              }`}
            >
              {letter}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function letterHrefFactory(route: Route, makeHref: (path: string, params?: Record<string, string | null | undefined>) => string) {
  return (letter: string | null) => {
    const params = new URLSearchParams(route.query.toString());
    if (letter === null) {
      return makeHref("/portfolios", { q: params.get("q") || null, sort: params.get("sort"), tech: params.get("tech") });
    }
    return makeHref(`/portfolios/letter/${letter.toLowerCase()}`, {
      q: params.get("q") || null,
      sort: params.get("sort"),
      tech: params.get("tech"),
    });
  };
}
