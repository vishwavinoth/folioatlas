import { FileQuestion, RotateCcw, SearchX, WifiOff } from "lucide-react";

export function EmptyState({ query, onClearFilters }: { query: string; onClearFilters?: () => void }) {
  return (
    <div className="surface-card motion-fade-in mx-auto flex max-w-lg flex-col items-center rounded-3xl px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--fa-accent)]/10 text-[var(--fa-accent)]">
        <SearchX className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">No portfolios found</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--fa-text-secondary)]">
        {query ? (
          <>
            Nothing matched <span className="font-medium text-foreground">“{query}”</span>. Try a shorter search term,
            a different focus area, or browse a letter instead.
          </>
        ) : (
          "No entries match the current filters. Try removing a filter or browsing a different letter."
        )}
      </p>
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-[var(--fa-accent)] px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--fa-accent-strong)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Clear search & filters
        </button>
      )}
    </div>
  );
}

export function ErrorState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="surface-card motion-fade-in mx-auto flex max-w-lg flex-col items-center rounded-3xl px-6 py-12 text-center" role="alert">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--fa-warning)]/15 text-[var(--fa-warning)]">
        <WifiOff className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--fa-text-secondary)]">
        {detail ?? "The directory index could not be loaded. Any previously generated data remains intact — please try again or check the synchronization report."}
      </p>
      <a
        href="#/"
        className="mt-5 inline-flex h-10 items-center rounded-full bg-[var(--fa-accent)] px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--fa-accent-strong)]"
      >
        Back to homepage
      </a>
    </div>
  );
}

export function NotFoundState() {
  return (
    <div className="surface-card motion-fade-in mx-auto flex max-w-lg flex-col items-center rounded-3xl px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--fa-text-secondary)]/10 text-[var(--fa-text-secondary)]">
        <FileQuestion className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-lg font-semibold">Page not found</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--fa-text-secondary)]">
        The page you were looking for doesn’t exist. It may have moved, or the link may be outdated.
      </p>
      <a
        href="#/"
        className="mt-5 inline-flex h-10 items-center rounded-full bg-[var(--fa-accent)] px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--fa-accent-strong)]"
      >
        Return to homepage
      </a>
    </div>
  );
}

export function LoadingSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden="true" aria-label="Loading results" role="status">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="surface-card rounded-2xl p-4">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-black/[0.07] dark:bg-white/[0.08]" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
            <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
            <div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading results…</span>
    </div>
  );
}
