"use client";

/**
 * FolioAtlas — path router on top of the Next.js App Router.
 *
 * Every view has a clean, server-rendered, shareable URL (PRD §4, §11):
 *
 *   /                          home
 *   /portfolios?q=…&tech=react&sort=name-asc&page=2
 *   /portfolios/letter/a
 *   /portfolio/{slug}
 *   /technologies  /technologies/{slug}
 *   /collections/{slug}
 *   /about  /methodology  /privacy
 *
 * Plain `<a href="/…">` anchors are intercepted by FolioAtlasApp for
 * client-side transitions, so middle-click / open-in-new-tab keep working.
 */
import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type Route = {
  /** e.g. "/portfolios/letter/a" — always lowercase, no trailing slash. */
  path: string;
  query: URLSearchParams;
};

type Navigator = { push: (href: string, opts?: { scroll?: boolean }) => void; replace: (href: string, opts?: { scroll?: boolean }) => void };

let activeRouter: Navigator | null = null;

export function normalizePath(pathname: string): string {
  return (pathname.replace(/\/+$/, "") || "/").toLowerCase();
}

export function buildHref(path: string, params?: Record<string, string | null | undefined>): string {
  const clean = normalizePath(path.startsWith("/") ? path : `/${path}`);
  if (!params) return clean;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${clean}?${qs}` : clean;
}

/**
 * Client-side navigation. Push (default) keeps back/forward between views;
 * `replace: true` rewrites the current entry without scrolling — used for
 * transient query updates (typing, filter chips) so history is not spammed.
 */
export function navigateTo(href: string, replace = false): void {
  if (!activeRouter) {
    if (replace) window.location.replace(href);
    else window.location.assign(href);
    return;
  }
  if (replace) activeRouter.replace(href, { scroll: false });
  else activeRouter.push(href);
}

export function useRoute(): {
  route: Route;
  navigate: (href: string, opts?: { replace?: boolean }) => void;
} {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    activeRouter = router;
  }, [router]);

  const queryString = searchParams?.toString() ?? "";
  const route = useMemo(
    () => ({ path: normalizePath(pathname), query: new URLSearchParams(queryString) }),
    [pathname, queryString]
  );

  const navigate = useCallback((href: string, opts?: { replace?: boolean }) => {
    navigateTo(href, opts?.replace ?? false);
  }, []);

  return { route, navigate };
}
