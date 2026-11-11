"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

function pageWindow(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  // Snap toward the nearest edge for context
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({
  page,
  totalPages,
  makeHref,
  onPageFallback,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
  /** Used when JS navigation is preferable (keeps scroll behavior consistent). */
  onPageFallback?: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const items = pageWindow(page, totalPages);

  return (
    <nav aria-label="Directory pages" className="glass mx-auto flex w-fit items-center gap-1 rounded-full p-1.5">
      {page > 1 ? (
        <a
          href={makeHref(page - 1)}
          onClick={onPageFallback ? (e) => { e.preventDefault(); onPageFallback(page - 1); } : undefined}
          className="flex h-9 items-center gap-1 rounded-full px-3 text-sm text-[var(--fa-text-secondary)] transition-colors hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Prev</span>
        </a>
      ) : (
        <span className="flex h-9 items-center gap-1 rounded-full px-3 text-sm text-[var(--fa-text-secondary)] opacity-40" aria-disabled="true">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Prev</span>
        </span>
      )}

      <span className="mx-1 hidden text-sm text-[var(--fa-text-secondary)] sm:inline" aria-hidden="true">
        Page {page} of {totalPages}
      </span>
      <span className="sr-only" role="status">
        Page {page} of {totalPages}
      </span>

      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span key={`e-${i}`} className="hidden h-9 w-6 items-center justify-center text-sm text-[var(--fa-text-secondary)] sm:flex" aria-hidden="true">
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            aria-label={`Page ${item}, current page`}
            className="flex h-9 min-w-9 items-center justify-center rounded-full bg-[var(--fa-accent)] px-2.5 text-sm font-medium tabular-nums text-white shadow-sm"
          >
            {item}
            <span className="sm:hidden">&nbsp;/ {totalPages}</span>
          </span>
        ) : (
          <a
            key={item}
            href={makeHref(item)}
            onClick={onPageFallback ? (e) => { e.preventDefault(); onPageFallback(item); } : undefined}
            aria-label={`Page ${item}`}
            className="hidden h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm text-[var(--fa-text-secondary)] transition-colors hover:bg-black/[0.05] hover:text-foreground sm:flex dark:hover:bg-white/[0.07]"
          >
            {item}
          </a>
        )
      )}

      {page < totalPages ? (
        <a
          href={makeHref(page + 1)}
          onClick={onPageFallback ? (e) => { e.preventDefault(); onPageFallback(page + 1); } : undefined}
          className="flex h-9 items-center gap-1 rounded-full px-3 text-sm text-[var(--fa-text-secondary)] transition-colors hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : (
        <span className="flex h-9 items-center gap-1 rounded-full px-3 text-sm text-[var(--fa-text-secondary)] opacity-40" aria-disabled="true">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
