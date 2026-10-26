"use client";

import { useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ArrowRight, Compass, LayoutGrid, Info, Shield, Keyboard, CornerDownLeft } from "lucide-react";
import type { SearchResult } from "@/lib/api-types";
import { useApi, useDebounced } from "@/hooks/use-api";
import { SHORTCUT_DOCS } from "@/hooks/use-shortcuts";
import { navigateHash } from "@/lib/router/hash-router";
import { technologyLabel } from "@/lib/portfolio/classify";

const NAV_COMMANDS = [
  { href: "#/", label: "Go to Discover", icon: Compass },
  { href: "#/portfolios", label: "Browse all portfolios", icon: LayoutGrid },
  { href: "#/technologies", label: "Browse focus areas", icon: Search },
  { href: "#/about", label: "About FolioAtlas", icon: Info },
  { href: "#/methodology", label: "Methodology & data provenance", icon: Shield },
];

/**
 * Command palette (⌘K): live portfolio search via the server API plus
 * navigation commands. Enter opens the detail view; ⌘/Ctrl+Enter opens the
 * result in a new tab.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchHref?: (q: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const query = useDebounced(draft.trim(), 220);

  // Reset the draft when closed so the next open starts fresh — render-time
  // adjustment instead of setState-in-effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setDraft("");
  }

  const searchUrl = query.length >= 2 ? `/api/search?q=${encodeURIComponent(query)}&pageSize=8&sort=relevance` : null;
  const { data } = useApi<SearchResult>(open ? searchUrl : null);

  // Controlled selection: keep the highlight on the top portfolio result
  // whenever the result set changes, so Enter always activates what the user
  // sees first (cmdk would otherwise keep the previously selected item).
  const [selected, setSelected] = useState("");
  const firstResultValue = data?.items[0] ? `portfolio-${data.items[0].id}` : "";
  const selectionKey = `${firstResultValue}|${query}`;
  const [prevSelectionKey, setPrevSelectionKey] = useState(selectionKey);
  if (prevSelectionKey !== selectionKey) {
    setPrevSelectionKey(selectionKey);
    setSelected(firstResultValue || query || "");
  }

  const runItem = (href: string, newTab: boolean) => {
    onOpenChange(false);
    if (newTab) {
      const url = `${window.location.origin}${window.location.pathname}${href}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      navigateHash(href);
    }
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      shouldFilter={false}
      commandProps={{ value: selected, onValueChange: setSelected }}
    >
      <CommandInput
        placeholder="Search portfolios, developers, technologies…"
        value={draft}
        onValueChange={setDraft}
      />
      <CommandList>
        <CommandEmpty>
          {query.length >= 2 ? (
            <span className="text-sm text-[var(--fa-text-secondary)]">
              No matches for “{query}”.
              <a
                href={`#/portfolios?q=${encodeURIComponent(query)}`}
                onClick={() => onOpenChange(false)}
                className="ml-1 text-[var(--fa-accent)] hover:underline"
              >
                Full-text search
                <ArrowRight className="ml-0.5 inline h-3 w-3" aria-hidden="true" />
              </a>
            </span>
          ) : (
            <span className="text-sm text-[var(--fa-text-secondary)]">Type at least two characters to search.</span>
          )}
        </CommandEmpty>

        {data && data.items.length > 0 && (
          <CommandGroup heading={`Portfolios — ${data.total} match${data.total === 1 ? "" : "es"}`}>
            {data.items.map((p) => (
              <CommandItem
                key={p.id}
                value={`portfolio-${p.id}`}
                onSelect={() => runItem(`#/portfolio/${p.slug}`, false)}
                className="gap-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--fa-accent)]/10 text-xs font-semibold text-[var(--fa-accent)]">
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-[var(--fa-text-secondary)]">
                    {p.role ?? technologyLabel(p.technologies[0] ?? "") ?? p.letter}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] text-[var(--fa-text-secondary)]">
                  <CornerDownLeft className="inline h-3 w-3" aria-hidden="true" /> Enter · ⌘↵ new tab
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Navigate">
          {NAV_COMMANDS.map((cmd) => (
            <CommandItem key={cmd.href} value={cmd.label} onSelect={() => runItem(cmd.href, false)}>
              <cmd.icon className="mr-1 h-4 w-4 text-[var(--fa-text-secondary)]" aria-hidden="true" />
              {cmd.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/** Keyboard shortcut reference panel ("?"). */
export function ShortcutsHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Keyboard className="h-5 w-5 text-[var(--fa-accent)]" aria-hidden="true" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            FolioAtlas is fully keyboard navigable. Shortcuts never fire while you are typing.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-1.5 pb-2">
          {SHORTCUT_DOCS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 text-sm odd:bg-black/[0.03] dark:odd:bg-white/[0.04]">
              <span className="text-[var(--fa-text-secondary)]">{s.action}</span>
              <kbd className="shrink-0 rounded-md border border-[var(--surface-border)] bg-background px-2 py-0.5 font-mono text-xs font-medium">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
