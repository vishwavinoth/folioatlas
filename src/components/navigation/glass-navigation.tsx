"use client";

import { useEffect, useRef, useState } from "react";
import { Compass, Github, Menu, Search, X } from "lucide-react";
import { buildHref, useRoute, type Route } from "@/lib/router/router";
import { paletteControls } from "@/components/command/palette-host";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Discover", match: (r: Route) => r.path === "/" },
  { href: "/portfolios", label: "Portfolios", match: (r: Route) => r.path.startsWith("/portfolios") },
  { href: "/technologies", label: "Technologies", match: (r: Route) => r.path.startsWith("/technologies") },
  { href: "/about", label: "About", match: (r: Route) => r.path.startsWith("/about") },
];

const SOURCE_REPO_URL = "https://github.com/emmabostian/developer-portfolios";

export function GlassNavigation() {
  const { route } = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu whenever the route changes — adjusted during render
  // (React's recommended pattern) instead of inside an effect.
  const routeKey = `${route.path}?${route.query.toString()}`;
  const [prevRouteKey, setPrevRouteKey] = useState(routeKey);
  if (prevRouteKey !== routeKey) {
    setPrevRouteKey(routeKey);
    if (menuOpen) setMenuOpen(false);
  }

  // Escape closes the non-modal menu; click-outside too.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-3 px-3 sm:pt-4">
      <nav
        aria-label="Primary"
        className="glass mx-auto flex h-14 max-w-5xl items-center gap-1 rounded-2xl px-3 sm:px-4"
      >
        <a
          href="/"
          className="mr-1 flex items-center gap-2 rounded-lg px-1.5 py-1.5 font-semibold tracking-tight"
          aria-label="FolioAtlas home"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--fa-accent)] text-white shadow-sm">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-[15px]">FolioAtlas</span>
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-0.5 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = item.match(route);
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-[var(--fa-accent)]/10 font-medium text-[var(--fa-accent)]"
                      : "text-[var(--fa-text-secondary)] hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Command palette trigger (⌘K) — also opens via the global shortcut. */}
          <button
            type="button"
            onClick={() => paletteControls.open()}
            className="flex h-9 items-center gap-2 rounded-full border border-[var(--surface-border)] px-2.5 text-[var(--fa-text-secondary)] transition-colors hover:text-foreground sm:px-3"
            aria-label="Open command palette (Ctrl or Cmd + K)"
            aria-haspopup="dialog"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hidden text-sm lg:inline">Quick find</span>
            <kbd className="hidden rounded border border-[var(--surface-border)] px-1.5 py-0.5 font-mono text-[10px] lg:inline">
              ⌘K
            </kbd>
          </button>

          <a
            href={SOURCE_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-9 items-center gap-2 rounded-full border border-[var(--surface-border)] px-3 text-sm text-[var(--fa-text-secondary)] transition-colors hover:text-foreground xl:flex"
            aria-label="View the upstream source repository on GitHub (opens in a new tab)"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            <span className="hidden 2xl:inline">Source</span>
          </a>

          {/* Theme control lives in the mobile menu to keep the compact bar uncluttered (PRD §4.1). */}
          <div className="hidden md:flex">
            <ThemeToggle />
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--fa-text-secondary)] transition-colors hover:bg-black/[0.05] hover:text-foreground md:hidden dark:hover:bg-white/[0.07]"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu — non-modal popover panel */}
      {menuOpen && (
        <div
          id="mobile-menu"
          ref={menuRef}
          className="motion-fade-in glass mx-auto mt-2 max-w-5xl rounded-2xl p-2 md:hidden"
        >
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => {
              const active = item.match(route);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-xl px-4 py-3 text-[15px] transition-colors ${
                      active
                        ? "bg-[var(--fa-accent)]/10 font-medium text-[var(--fa-accent)]"
                        : "text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
            <li>
              <a
                href={SOURCE_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] text-[var(--fa-text-secondary)] transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                Source repository
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          </ul>
          <div className="mt-1 flex items-center justify-between border-t border-[var(--surface-border)] px-4 pb-1 pt-3">
            <span className="text-[15px] text-[var(--fa-text-secondary)]">Appearance</span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}

export { buildHref };
