"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  /** Current value (controlled by URL state). */
  value: string;
  /** Called on each change; parent decides debounce policy. */
  onChange: (next: string) => void;
  /** Delay in ms before committing the change (default 150). */
  debounceMs?: number;
  placeholder?: string;
  size?: "md" | "lg";
  label?: string;
  autoFocus?: boolean;
  id?: string;
};

export function GlassSearchField({
  value,
  onChange,
  debounceMs = 150,
  placeholder = "Search by name, URL, domain or focus area…",
  size = "md",
  label = "Search portfolios",
  autoFocus = false,
  id = "portfolio-search",
}: Props) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the draft in sync when the committed value changes externally
  // (e.g. clear-all filters, navigating between letter pages).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleChange = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), debounceMs);
  };

  const committed = draft === value;
  const height = size === "lg" ? "h-13 sm:h-14" : "h-11";

  return (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
      className="glass group relative flex w-full items-center rounded-full"
      aria-label={label}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none ml-4 h-[18px] w-[18px] shrink-0 text-[var(--fa-text-secondary)]"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        className={`peer ${height} w-full bg-transparent pl-3 pr-11 text-[15px] text-foreground outline-none placeholder:text-[var(--fa-text-secondary)] [&::-webkit-search-cancel-button]:hidden`}
      />
      {draft && (
        <button
          type="button"
          onClick={() => handleChange("")}
          aria-label="Clear search"
          className={`absolute right-2 ${size === "lg" ? "top-1/2 -translate-y-1/2" : "top-1/2 -translate-y-1/2"} flex h-7 w-7 items-center justify-center rounded-full text-[var(--fa-text-secondary)] transition-colors hover:bg-black/[0.06] hover:text-foreground dark:hover:bg-white/[0.08] ${committed ? "" : "text-[var(--fa-accent)]"}`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}
