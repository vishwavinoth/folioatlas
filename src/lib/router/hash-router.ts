"use client";

/**
 * FolioAtlas — lightweight hash router.
 *
 * The app is a single-route Next.js page (`/`) in this environment, so the
 * PRD's information architecture is implemented as shareable hash URLs:
 *
 *   #/                       home
 *   #/portfolios?q=…&letter=A&tech=react&sort=name-asc&page=2
 *   #/portfolios/letter/a
 *   #/technologies
 *   #/technologies/react
 *   #/about  #/methodology  #/privacy
 *
 * Plain anchors (`href="#/…"`) give back/forward + middle-click for free.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

export type Route = {
  /** e.g. "/portfolios/letter/a" — always lowercase, no trailing slash. */
  path: string;
  query: URLSearchParams;
};

export function parseHash(hash: string): Route {
  let raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith("/")) raw = "/" + raw;
  const [pathPart, queryPart = ""] = raw.split("?");
  const path = pathPart.replace(/\/+$/, "") || "/";
  return { path: path.toLowerCase(), query: new URLSearchParams(queryPart) };
}

export function buildHref(path: string, params?: Record<string, string | null | undefined>): string {
  const clean = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "") || "/";
  if (!params) return `#${clean}`;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `#${clean}?${qs}` : `#${clean}`;
}

const NAVIGATE_EVENT = "fa:navigate";

/**
 * Navigate via hash. Push (default) keeps back/forward between views;
 * `replace: true` rewrites the current entry — used for transient query
 * updates (typing, filter chips) so history is not spammed (PRD §9.4).
 */
export function navigateHash(href: string, replace = false): void {
  const target = href.startsWith("#") ? href : `#${href}`;
  if (replace) {
    history.replaceState(null, "", target);
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
  } else {
    if (window.location.hash === target) {
      window.dispatchEvent(new Event(NAVIGATE_EVENT));
      return;
    }
    window.location.hash = target;
  }
}

export function useHashRoute(): {
  route: Route;
  navigate: (href: string, opts?: { replace?: boolean }) => void;
} {
  // Initialize to the same value the server rendered ("#/") so hydration
  // matches, then align with the real URL right after mount (deep links).
  const [hash, setHash] = useState("#/");

  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    if (window.location.hash && window.location.hash !== "#/") {
      queueMicrotask(onChange);
    }
    window.addEventListener("hashchange", onChange);
    window.addEventListener(NAVIGATE_EVENT, onChange);
    return () => {
      window.removeEventListener("hashchange", onChange);
      window.removeEventListener(NAVIGATE_EVENT, onChange);
    };
  }, []);

  const route = useMemo(() => parseHash(hash), [hash]);

  const navigate = useCallback((href: string, opts?: { replace?: boolean }) => {
    navigateHash(href, opts?.replace ?? false);
  }, []);

  return { route, navigate };
}
