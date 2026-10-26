"use client";

import { useId, useRef, useState } from "react";
import { ArrowDownUp, Check, ChevronDown, Tags, X } from "lucide-react";
import type { TechnologyCategory } from "@/lib/portfolio/types";
import { TechnologyChip } from "@/components/directory/technology-chip";

export type ActiveFilters = {
  q: string;
  letter: string | null;
  technology: string | null;
};

type Props = {
  technologies: TechnologyCategory[];
  active: ActiveFilters;
  activeTechLabel: string | null;
  onSortChange: (sort: "name-asc" | "name-desc") => void;
  sort: "name-asc" | "name-desc";
  onTechnologyChange: (slug: string | null) => void;
  onRemoveFilter: (key: "q" | "letter" | "technology") => void;
  onClearAll: () => void;
  resultCount: number;
  totalCount: number;
};

/** A glass popover — closes on Escape / click-outside, focus stays free (non-modal). */
function GlassPopover({
  trigger,
  children,
  align = "left",
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void; panelId: string }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      {trigger({ open, toggle: () => setOpen((v) => !v), panelId: id })}
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={label}
          className={`motion-fade-in glass absolute z-40 mt-2 min-w-56 rounded-2xl p-1.5 ${
            align === "right" ? "right-0" : "left-0"
          }`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function GlassFilterBar({
  technologies,
  active,
  activeTechLabel,
  onSortChange,
  sort,
  onTechnologyChange,
  onRemoveFilter,
  onClearAll,
  resultCount,
  totalCount,
}: Props) {
  // Click-outside handling for the whole bar's popovers
  const barRef = useRef<HTMLDivElement>(null);
  const [popoverOpen, setPopoverOpen] = useState<string | null>(null);

  const activeChips: Array<{ key: "q" | "letter" | "technology"; label: string }> = [];
  if (active.q) activeChips.push({ key: "q", label: `“${active.q}”` });
  if (active.letter) activeChips.push({ key: "letter", label: `Letter ${active.letter}` });
  if (active.technology) activeChips.push({ key: "technology", label: activeTechLabel ?? active.technology });

  return (
    <div
      ref={barRef}
      className="glass rounded-2xl p-2"
      onMouseDown={(e) => {
        if (popoverOpen && !barRef.current?.querySelector(`[data-popover="${popoverOpen}"]`)?.contains(e.target as Node)) {
          setPopoverOpen(null);
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort */}
        <GlassPopover
          label="Sort results"
          align="left"
          trigger={({ open, toggle, panelId }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-controls={panelId}
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-[var(--fa-text-secondary)] transition-colors hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]"
            >
              <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{sort === "name-asc" ? "A–Z" : "Z–A"}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          )}
        >
          {(close) => (
            <ul role="listbox" aria-label="Sort order" className="flex flex-col">
              {(
                [
                  { value: "name-asc", label: "Name A–Z" },
                  { value: "name-desc", label: "Name Z–A" },
                ] as const
              ).map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={sort === opt.value}
                    onClick={() => {
                      onSortChange(opt.value);
                      close();
                    }}
                    className={`flex w-full items-center justify-between gap-6 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                      sort === opt.value
                        ? "bg-[var(--fa-accent)]/10 font-medium text-[var(--fa-accent)]"
                        : "hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                    }`}
                  >
                    {opt.label}
                    {sort === opt.value && <Check className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassPopover>

        {/* Technology filter */}
        <GlassPopover
          label="Filter by primary focus area"
          align="left"
          trigger={({ open, toggle, panelId }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-controls={panelId}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-sm transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.07] ${
                active.technology
                  ? "bg-[var(--fa-accent)]/10 font-medium text-[var(--fa-accent)]"
                  : "text-[var(--fa-text-secondary)] hover:text-foreground"
              }`}
            >
              <Tags className="h-4 w-4" aria-hidden="true" />
              <span className="max-w-36 truncate">{activeTechLabel ?? "Focus area"}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          )}
        >
          {(close) => (
            <div className="fa-scroll max-h-72 w-64 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onTechnologyChange(null);
                  close();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  !active.technology
                    ? "bg-[var(--fa-accent)]/10 font-medium text-[var(--fa-accent)]"
                    : "hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                }`}
              >
                All portfolios
                {!active.technology && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
              <div className="my-1 border-t border-[var(--surface-border)]" role="separator" />
              {technologies.map((tech) => (
                <button
                  key={tech.slug}
                  type="button"
                  onClick={() => {
                    onTechnologyChange(tech.slug);
                    close();
                  }}
                  aria-current={active.technology === tech.slug ? "true" : undefined}
                  className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    active.technology === tech.slug
                      ? "bg-[var(--fa-accent)]/10 font-medium text-[var(--fa-accent)]"
                      : "hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="truncate">{tech.label}</span>
                  <span className="shrink-0 text-xs text-[var(--fa-text-secondary)]">{tech.count}</span>
                </button>
              ))}
            </div>
          )}
        </GlassPopover>

        {/* Result count + active chips */}
        <p className="ml-auto hidden text-sm text-[var(--fa-text-secondary)] sm:block" role="status" aria-live="polite">
          {resultCount.toLocaleString()} of {totalCount.toLocaleString()} portfolios
        </p>
      </div>

      {activeChips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[var(--surface-border)] pt-2">
          <span className="sr-only">Active filters:</span>
          {activeChips.map((chip) => (
            <TechnologyChip key={chip.key} label={chip.label} removable onRemove={() => onRemoveFilter(chip.key)} />
          ))}
          {activeChips.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-[var(--fa-accent)] transition-colors hover:bg-[var(--fa-accent)]/10"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
