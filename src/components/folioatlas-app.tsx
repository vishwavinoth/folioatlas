"use client";

import { Component, useEffect, useRef, type ReactNode } from "react";
import type { ClientIndex } from "@/lib/portfolio/types";
import { useHashRoute, type Route } from "@/lib/router/hash-router";
import { GlassNavigation } from "@/components/navigation/glass-navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { HomeView } from "@/components/views/home-view";
import { DirectoryView } from "@/components/views/directory-view";
import { TechnologiesView } from "@/components/views/technologies-view";
import { AboutView, MethodologyView, PrivacyView } from "@/components/views/content-views";
import { ErrorState, NotFoundState } from "@/components/feedback/states";

/** Per-view document titles (keeps history entries and shares descriptive). */
function titleFor(route: Route, index: ClientIndex): string {
  const p = route.path;
  if (p === "/" || p === "") return "FolioAtlas — Discover Developer Portfolios";
  if (p.startsWith("/portfolios/letter/")) {
    const letter = p.split("/")[3]?.toUpperCase() ?? "";
    return `Portfolios starting with ${letter} | FolioAtlas`;
  }
  if (p.startsWith("/technologies/")) {
    const slug = p.split("/")[2] ?? "";
    const known = index.technologies.some((t) => t.slug === slug);
    if (!known) return "Page not found | FolioAtlas";
    const label = index.technologies.find((t) => t.slug === slug)?.label ?? slug;
    return `${label} Developer Portfolios | FolioAtlas`;
  }
  if (p === "/portfolios") return "Developer Portfolio Directory | FolioAtlas";
  if (p === "/technologies") return "Browse by Focus Area | FolioAtlas";
  if (p === "/about") return "About | FolioAtlas";
  if (p === "/methodology") return "Methodology | FolioAtlas";
  if (p === "/privacy") return "Privacy | FolioAtlas";
  return "Page not found | FolioAtlas";
}

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

function renderView(route: Route, index: ClientIndex): ReactNode {
  const p = route.path;

  if (p === "/" || p === "") return <HomeView index={index} />;

  if (p === "/portfolios") return <DirectoryView index={index} route={route} />;

  if (p.startsWith("/portfolios/letter/")) {
    const letter = p.split("/")[3] ?? "";
    if (!/^[a-z]$/.test(letter)) return <NotFoundState />;
    return <DirectoryView index={index} route={route} />;
  }

  if (p === "/technologies") return <TechnologiesView index={index} />;

  if (p.startsWith("/technologies/")) {
    const slug = p.split("/")[2] ?? "";
    const exists = index.technologies.some((t) => t.slug === slug);
    if (!exists) return <NotFoundState />;
    return <DirectoryView index={index} route={route} />;
  }

  if (p === "/about") return <AboutView index={index} />;
  if (p === "/methodology") return <MethodologyView index={index} />;
  if (p === "/privacy") return <PrivacyView />;

  return <NotFoundState />;
}

export function FolioAtlasApp({ index }: { index: ClientIndex }) {
  const { route } = useHashRoute();

  // Scroll to top when the view (path) changes, not on query tweaks.
  const prevPath = useRef(route.path);
  useEffect(() => {
    if (prevPath.current !== route.path) {
      prevPath.current = route.path;
      window.scrollTo({ top: 0 });
    }
  }, [route.path]);

  // Keep document.title in sync with the active view.
  useEffect(() => {
    document.title = titleFor(route, index);
  }, [route, index]);

  return (
    <>
      <GlassNavigation />
      <main id="main-content" className="flex-1 pt-[76px]">
        <ViewErrorBoundary>
          {index.portfolios.length === 0 ? (
            <div className="px-4 py-16">
              <ErrorState title="Directory index unavailable" />
            </div>
          ) : (
            renderView(route, index)
          )}
        </ViewErrorBoundary>
      </main>
      <SiteFooter index={index} />
    </>
  );
}
