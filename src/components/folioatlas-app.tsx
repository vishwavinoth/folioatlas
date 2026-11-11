"use client";

import { Component, useEffect, useRef, type ReactNode } from "react";
import type { ClientIndex } from "@/lib/portfolio/types";
import { collectionBySlug } from "@/lib/portfolio/collections";
import { navigateTo, useRoute, type Route } from "@/lib/router/router";
import { FeaturesProvider, type Features } from "@/lib/features/context";
import { PrefetchProvider, type PrefetchMap } from "@/hooks/prefetch-context";
import { GlassNavigation } from "@/components/navigation/glass-navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { HomeView } from "@/components/views/home-view";
import { DirectoryView } from "@/components/views/directory-view";
import { TechnologiesView, TechnologyLandingView } from "@/components/views/technologies-view";
import { AboutView, MethodologyView, PrivacyView } from "@/components/views/content-views";
import { ErrorState, NotFoundState } from "@/components/feedback/states";
import { PortfolioDetail } from "@/components/portfolio/portfolio-detail";
import { LeaderboardView } from "@/components/views/leaderboard-view";
import { CommandPaletteHost } from "@/components/command/palette-host";

class ViewErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[FolioAtlas] view error:", error);
  }
  render() {
    if (this.state.hasError) {
      return <ErrorState title="Something went wrong" detail="The view failed to render. The directory data itself is intact — please navigate again." />;
    }
    return this.props.children;
  }
}

function renderView(route: Route, index: ClientIndex, features: Features): ReactNode {
  const p = route.path;

  if (p === "/" || p === "") return <HomeView />;

  if (p === "/portfolios") return <DirectoryView index={index} route={route} />;

  if (p.startsWith("/portfolios/letter/")) {
    const letter = p.split("/")[3] ?? "";
    if (!/^[a-z]$/.test(letter)) return <NotFoundState />;
    return <DirectoryView index={index} route={route} />;
  }

  if (p.startsWith("/portfolio/")) {
    const slug = p.split("/")[2] ?? "";
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) return <NotFoundState title="Portfolio not found" detail="This link is malformed. Browse the directory to find the developer you are looking for." />;
    return <PortfolioDetail key={slug} slug={slug} />;
  }

  if (p.startsWith("/collections/")) {
    const slug = p.split("/")[2] ?? "";
    if (!collectionBySlug(slug)) return <NotFoundState title="Collection not found" />;
    return <DirectoryView index={index} route={route} />;
  }

  if (p === "/technologies") return <TechnologiesView index={index} />;

  if (p.startsWith("/technologies/")) {
    const slug = p.split("/")[2] ?? "";
    const exists = index.technologies.some((t) => t.slug === slug);
    if (!exists) return <NotFoundState />;
    return <TechnologyLandingView key={slug} slug={slug} index={index} route={route} />;
  }

  if (p === "/leaderboard") return features.engagement ? <LeaderboardView route={route} /> : <NotFoundState />;

  if (p === "/about") return <AboutView index={index} />;
  if (p === "/methodology") return <MethodologyView index={index} />;
  if (p === "/privacy") return <PrivacyView />;

  return <NotFoundState />;
}

/** Same-origin page links handled by the client router (not API routes or files). */
function internalHref(anchor: HTMLAnchorElement): string | null {
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  const href = anchor.getAttribute("href");
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null;
  if (href.startsWith("/api/") || /\.[a-z0-9]+(\?|$)/i.test(href.split("#")[0])) return null;
  return href;
}

export function FolioAtlasApp({
  index,
  features,
  prefetch = {},
}: {
  index: ClientIndex;
  features: Features;
  /** Server-rendered API responses for this page (see payloads.ts). */
  prefetch?: PrefetchMap;
}) {
  const { route } = useRoute();

  // Client-side transitions for plain anchors; modifier clicks keep native behavior.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = internalHref(anchor);
      if (!href) return;
      e.preventDefault();
      navigateTo(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Links shared before clean URLs ("/#/portfolios?q=…") keep working.
  useEffect(() => {
    const legacy = window.location.hash;
    if (legacy.startsWith("#/")) navigateTo(legacy.slice(1) || "/", true);
  }, []);

  // Scroll to top when the view (path) changes, not on query tweaks.
  const prevPath = useRef(route.path);
  useEffect(() => {
    if (prevPath.current !== route.path) {
      prevPath.current = route.path;
      window.scrollTo({ top: 0 });
    }
  }, [route.path]);

  return (
    <FeaturesProvider value={features}>
      <PrefetchProvider value={prefetch}>
      <GlassNavigation />
      <main id="main-content" className="flex-1 pt-[76px]">
        <ViewErrorBoundary>
          {index.technologies.length === 0 ? (
            <div className="px-4 py-16">
              <ErrorState title="Directory index unavailable" />
            </div>
          ) : (
            renderView(route, index, features)
          )}
        </ViewErrorBoundary>
      </main>
      <SiteFooter index={index} />
      <CommandPaletteHost />
      </PrefetchProvider>
    </FeaturesProvider>
  );
}
