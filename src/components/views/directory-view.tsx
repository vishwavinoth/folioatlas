"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Clock,
  Filter,
  Github,
  Globe,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type { AiSearchResponse, SearchResult, TechnologyMeta, WirePortfolio } from "@/lib/api-types";
import type { ClientIndex } from "@/lib/portfolio/types";
import { useApi } from "@/hooks/use-api";
import { paletteControls } from "@/components/command/palette-host";
import { buildHref, navigateTo, type Route } from "@/lib/router/router";
import { useFeatures } from "@/lib/features/context";
import { searchApiUrl } from "@/lib/router/api-urls";
import { toast } from "@/lib/notify";
import { collectionBySlug } from "@/lib/portfolio/collections";
import { technologyLabel } from "@/lib/portfolio/classify";
import { GlassSearchField } from "@/components/search/glass-search-field";
import { PortfolioCard } from "@/components/directory/portfolio-card";
import { Pagination } from "@/components/directory/pagination";
import { EmptyState } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const SORTS = [
  { key: "relevance", label: "Relevant matches" },
  { key: "newest", label: "Newest added" },
  { key: "name-asc", label: "Name A→Z" },
  { key: "name-desc", label: "Name Z→A" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

const AI_EXAMPLES = [
  "Find Next.js developers who build AI tools",
  "Show backend developers experienced with APIs and cloud deployments",
  "Portfolios focused on React, TypeScript and developer tooling",
];

type DirectoryProps = {
  index: ClientIndex;
  route: Route;
  /** Suppress the h1/p header (used by technology landing pages that render their own). */
  hideHeading?: boolean;
};

/**
 * Directory view (PRD §5, §6) — server-backed keyword search, AI search and
 * advanced filters. All filter/search state lives in the URL query string so
 * every result set is a shareable direct link.
 */
export function DirectoryView({ index, route, hideHeading = false }: DirectoryProps) {
  const isTechRoute = route.path.startsWith("/technologies/");
  const techSlugFromPath = isTechRoute ? route.path.split("/")[2] || null : null;
  const collectionSlugFromPath = route.path.startsWith("/collections/")
    ? route.path.split("/")[2] || null
    : null;
  const collectionDef = collectionSlugFromPath ? collectionBySlug(collectionSlugFromPath) : null;
  const letterFromPath = route.path.startsWith("/portfolios/letter/") ? (route.path.split("/")[3]?.toUpperCase() ?? null) : null;
  // Direct-link support: ?letter=a also works (path form stays canonical).
  const letterQuery = route.query.get("letter");
  const letter = letterFromPath ?? (letterQuery && /^[a-z]$/i.test(letterQuery) ? letterQuery.toUpperCase() : null);

  // ── URL-driven state ─────────────────────────────────────────────────
  const urlQ = route.query.get("q") ?? "";
  const urlTech = (route.query.get("tech") ?? "").split(",").filter(Boolean);
  const siteParam = route.query.get("site");
  const site = siteParam === "own" || siteParam === "github" ? siteParam : "any";
  const hasSummary = route.query.get("hasSummary") === "true";
  const addedWithin = route.query.get("addedWithin");
  const sortParam = route.query.get("sort");
  const { ai: aiEnabled } = useFeatures();
  const aiParam = aiEnabled && route.query.get("ai") === "1";
  const pageParam = Math.max(1, Number(route.query.get("page") ?? "1") || 1);

  const [mode, setMode] = useState<"keyword" | "ai">(aiParam ? "ai" : "keyword");
  const [aiQuery, setAiQuery] = useState(aiParam ? urlQ : "");
  const [aiResult, setAiResult] = useState<AiSearchResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const techs = techSlugFromPath ? [techSlugFromPath] : urlTech;
  const sort: SortKey = SORTS.some((s) => s.key === sortParam) ? (sortParam as SortKey) : "name-asc";

  // ── Keyword search (server-backed; URL shared with server pre-rendering) ─
  const searchUrl = searchApiUrl(route);
  const { data, loading, error } = useApi<SearchResult>(mode === "keyword" ? searchUrl : null);

  const activeFilterCount =
    techs.length + (site !== "any" ? 1 : 0) + (hasSummary ? 1 : 0) + (addedWithin ? 1 : 0) + (letter ? 1 : 0) + (urlQ ? 1 : 0);

  // ── Navigation helpers ───────────────────────────────────────────────
  const baseParams = useCallback(
    () => ({
      q: urlQ || null,
      tech: techSlugFromPath ? null : techs.length ? techs.join(",") : null,
      site: site !== "any" ? site : null,
      hasSummary: hasSummary ? "true" : null,
      addedWithin: addedWithin || null,
      sort: sort !== "name-asc" ? sort : null,
      ai: mode === "ai" ? "1" : null,
      page: null as string | null,
    }),
    [urlQ, techs, site, hasSummary, addedWithin, sort, mode, techSlugFromPath]
  );

  const setQuery = (patch: Record<string, string | null>) => {
    navigateTo(buildHref(route.path, { ...baseParams(), ...patch }), true);
  };

  const toggleTech = (slug: string) => {
    const next = techs.includes(slug) ? techs.filter((t) => t !== slug) : [...techs, slug].slice(0, 5);
    setQuery({ tech: next.length ? next.join(",") : null, page: null });
  };

  const clearAll = () => {
    navigateTo(buildHref("/portfolios", { ai: mode === "ai" ? "1" : null }));
  };

  // ── AI search ────────────────────────────────────────────────────────
  const runAiSearch = async (q: string) => {
    if (!q.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setQuery({ q, page: null });
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (res.status === 503 || res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setAiError(body.error ?? "ai-unavailable");
        setMode("keyword");
        toast.warning("AI search is unavailable", {
          description: body.error === "rate-limited" ? "Rate limit reached — showing keyword results." : "Showing keyword results instead.",
        });
        return;
      }
      if (!res.ok) throw new Error(`http-${res.status}`);
      const json = (await res.json()) as AiSearchResponse;
      setAiResult(json);
    } catch {
      setAiError("ai-search-failed");
      setMode("keyword");
      toast.warning("AI search failed", { description: "Showing keyword results instead." });
    } finally {
      setAiLoading(false);
    }
  };

  // Switching back to keyword mode clears AI results.
  useEffect(() => {
    if (mode === "keyword") setAiResult(null);
  }, [mode]);

  const result = mode === "ai" && aiResult ? aiResult.results : data;
  const isAi = mode === "ai";
  const total = result?.total ?? 0;

  const activeTechLabels = techs.map((slug) => technologyLabel(slug));

  return (
    <div className="motion-fade-in mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:pt-10">
      {!hideHeading && (
        <header className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {collectionDef
              ? `${collectionDef.label} portfolios`
              : isTechRoute && activeTechLabels[0]
                ? `${activeTechLabels[0]} portfolios`
                : letter
                  ? `Portfolios starting with ${letter}`
                  : "Developer Portfolio Directory"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--fa-text-secondary)]">
            {collectionDef
              ? `${collectionDef.description} Every count is a real union over the indexed directory.`
              : isAi
                ? "Ask in plain language — the query is parsed into a typed search intent and executed against the real directory."
                : "Search by name, URL, domain or focus area. Every entry links to the original portfolio."}
          </p>
        </header>
      )}

      {/* Mode toggle (only when an AI provider is configured) */}
      {aiEnabled && (
      <div className="mt-5 flex items-center gap-2" role="tablist" aria-label="Search mode">
        {(["keyword", "ai"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-[var(--fa-accent)] text-white shadow-sm"
                : "glass-clear text-[var(--fa-text-secondary)] hover:text-foreground"
            }`}
          >
            {m === "keyword" ? <Search className="h-4 w-4" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {m === "keyword" ? "Keyword search" : "AI search"}
          </button>
        ))}
      </div>
      )}

      {/* Search inputs */}
      {mode === "keyword" ? (
        <div className="mt-3">
          <GlassSearchField
            value={urlQ}
            onChange={(next) => setQuery({ q: next || null, page: null })}
            placeholder="Search by name, URL, domain or focus area…"
            id="directory-search"
          />
        </div>
      ) : (
        <form
          className="glass mt-3 flex items-center rounded-full pl-4 pr-1.5 transition-shadow focus-within:ring-2 focus-within:ring-[var(--fa-accent)]/60"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            void runAiSearch(aiQuery);
          }}
        >
          <Sparkles className="h-[18px] w-[18px] shrink-0 text-[var(--fa-accent)]" aria-hidden="true" />
          <label htmlFor="ai-search" className="sr-only">
            AI natural-language search
          </label>
          <input
            id="ai-search"
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="e.g. Find Next.js developers who build AI tools"
            autoComplete="off"
            className="h-11 w-full bg-transparent px-3 text-[15px] outline-none placeholder:text-[var(--fa-text-secondary)]"
          />
          <Button type="submit" size="sm" disabled={aiLoading || !aiQuery.trim()} className="shrink-0 rounded-full">
            {aiLoading ? "Thinking…" : "Ask"}
          </Button>
        </form>
      )}

      {/* AI examples */}
      {mode === "ai" && !aiResult && !aiLoading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {AI_EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setAiQuery(ex);
                void runAiSearch(ex);
              }}
              className="rounded-full border border-dashed border-[var(--surface-border)] px-3 py-1.5 text-xs text-[var(--fa-text-secondary)] transition-colors hover:border-[var(--fa-accent)]/40 hover:text-[var(--fa-accent)]"
            >
              “{ex}”
            </button>
          ))}
        </div>
      )}

      {/* AI status panel */}
      {isAi && (aiLoading || aiError || aiResult) && (
        <div className="mt-3 rounded-2xl border border-[var(--fa-accent)]/25 bg-[var(--fa-accent)]/[0.05] p-4" aria-live="polite">
          {aiLoading && (
            <p className="text-sm text-[var(--fa-text-secondary)]">
              <Sparkles className="mr-1.5 inline h-4 w-4 text-[var(--fa-accent)]" aria-hidden="true" />
              Parsing your request into a search intent…
            </p>
          )}
          {aiResult && (
            <>
              <p className="text-sm font-medium">{aiResult.interpretation}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[var(--fa-text-secondary)]">Intent:</span>
                {aiResult.intent.technologies.map((t) => (
                  <span key={t} className="rounded-full bg-[var(--fa-accent)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--fa-accent)]">
                    {technologyLabel(t)}
                  </span>
                ))}
                {aiResult.intent.keywords.map((k) => (
                  <span key={k} className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 text-[11px] text-[var(--fa-text-secondary)]">
                    “{k}”
                  </span>
                ))}
                <span className="ml-1 text-[10px] text-[var(--fa-text-secondary)]">
                  via {aiResult.model} · {Math.round(aiResult.confidence * 100)}% confidence
                </span>
              </div>
              <p className="mt-2 text-[11px] text-[var(--fa-text-secondary)]">
                Results come from a real database query — the AI only builds the query; it cannot invent entries.
              </p>
            </>
          )}
          {aiError && (
            <p className="text-sm text-[var(--fa-text-secondary)]">
              AI search is unavailable right now ({aiError === "rate-limited" ? "rate limit reached" : "service error"}) — switched to keyword search. Try again shortly.
            </p>
          )}
        </div>
      )}

      {/* Advanced filters (keyword mode) */}
      {mode === "keyword" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Sort */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="glass-clear inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-[var(--fa-text-secondary)] transition-colors hover:text-foreground"
                aria-haspopup="listbox"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                {SORTS.find((s) => s.key === sort)?.label}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-1.5">
              <ul role="listbox" aria-label="Sort results">
                {SORTS.map((s) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sort === s.key}
                      onClick={() => setQuery({ sort: s.key === "name-asc" ? null : s.key, page: null })}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        sort === s.key ? "bg-[var(--fa-accent)]/10 font-medium text-[var(--fa-accent)]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      {s.label}
                      {sort === s.key && <Check className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>

          {/* Focus areas multi-select */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`glass-clear inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                  techs.length ? "text-[var(--fa-accent)]" : "text-[var(--fa-text-secondary)] hover:text-foreground"
                }`}
                aria-haspopup="listbox"
              >
                <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                Focus areas{techs.length ? ` · ${techs.length}` : ""}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-2">
              <p className="px-2 pb-1.5 text-[11px] text-[var(--fa-text-secondary)]">
                Select up to 5 — entries must match ALL selected areas.
              </p>
              <div className="max-h-64 overflow-y-auto rounded-lg" role="listbox" aria-label="Focus areas">
                {index.technologies.map((t) => {
                  const selected = techs.includes(t.slug);
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => toggleTech(t.slug)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        selected ? "bg-[var(--fa-accent)]/10 font-medium text-[var(--fa-accent)]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <span>{t.label}</span>
                      <span className="text-xs text-[var(--fa-text-secondary)]">{t.count.toLocaleString("en-US")}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Site type */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`glass-clear inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                  site !== "any" ? "text-[var(--fa-accent)]" : "text-[var(--fa-text-secondary)] hover:text-foreground"
                }`}
                aria-haspopup="listbox"
              >
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                {site === "own" ? "Own website" : site === "github" ? "GitHub-hosted" : "Site type"}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1.5">
              <ul role="listbox" aria-label="Site type">
                {[
                  { key: "any", label: "Any site", icon: Globe },
                  { key: "own", label: "Own website (not GitHub)", icon: Globe },
                  { key: "github", label: "GitHub-hosted only", icon: Github },
                ].map((o) => (
                  <li key={o.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={site === o.key}
                      onClick={() => setQuery({ site: o.key === "any" ? null : o.key, page: null })}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        site === o.key ? "bg-[var(--fa-accent)]/10 font-medium text-[var(--fa-accent)]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <o.icon className="h-4 w-4" aria-hidden="true" />
                      {o.label}
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>

          {/* Added recently */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`glass-clear inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                  addedWithin ? "text-[var(--fa-accent)]" : "text-[var(--fa-text-secondary)] hover:text-foreground"
                }`}
                aria-haspopup="listbox"
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {addedWithin ? `Added within ${addedWithin === "365" ? "1 year" : `${addedWithin} days`}` : "Date added"}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1.5">
              <ul role="listbox" aria-label="Date added">
                {[
                  { key: null, label: "Any time" },
                  { key: "30", label: "Last 30 days" },
                  { key: "90", label: "Last 90 days" },
                  { key: "365", label: "Last year" },
                ].map((o) => (
                  <li key={o.label}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={(addedWithin || null) === o.key}
                      onClick={() => setQuery({ addedWithin: o.key, page: null })}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        (addedWithin || null) === o.key ? "bg-[var(--fa-accent)]/10 font-medium text-[var(--fa-accent)]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      {o.label}
                      {(addedWithin || null) === o.key && <Check className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="px-3 pb-1 pt-1 text-[10px] leading-relaxed text-[var(--fa-text-secondary)]">
                Uses verified first-seen dates from upstream commits.
              </p>
            </PopoverContent>
          </Popover>

          {/* Has AI summary toggle */}
          {aiEnabled && (
          <button
            type="button"
            aria-pressed={hasSummary}
            onClick={() => setQuery({ hasSummary: hasSummary ? null : "true", page: null })}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
              hasSummary
                ? "bg-[var(--fa-accent)] text-white"
                : "glass-clear text-[var(--fa-text-secondary)] hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Has AI summary
          </button>
          )}

          <button
            type="button"
            onClick={() => paletteControls.open()}
            className="glass-clear ml-auto hidden h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] text-[var(--fa-text-secondary)] transition-colors hover:text-foreground lg:inline-flex"
          >
            Quick find
            <kbd className="rounded border border-[var(--surface-border)] px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {urlQ && (
            <FilterChip label={`“${urlQ}”`} onRemove={() => setQuery({ q: null, page: null })} />
          )}
          {activeTechLabels.map((label, i) => (
            <FilterChip key={label} label={label} onRemove={() => toggleTech(techs[i])} />
          ))}
          {letter && (
            <FilterChip
              label={`Letter ${letter}`}
              onRemove={() => navigateTo(buildHref("/portfolios", { ...baseParams(), letter: null }))}
            />
          )}
          {site !== "any" && (
            <FilterChip label={site === "own" ? "Own website" : "GitHub-hosted"} onRemove={() => setQuery({ site: null, page: null })} />
          )}
          {hasSummary && <FilterChip label="Has AI summary" onRemove={() => setQuery({ hasSummary: null, page: null })} />}
          {addedWithin && (
            <FilterChip label={`Added within ${addedWithin === "365" ? "1 year" : `${addedWithin}d`}`} onRemove={() => setQuery({ addedWithin: null, page: null })} />
          )}
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 text-xs font-medium text-[var(--fa-accent)] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Result count */}
      <p className="mt-6 text-sm text-[var(--fa-text-secondary)]" role="status" aria-live="polite">
        {loading || aiLoading
          ? "Searching…"
          : `${total.toLocaleString("en-US")} result${total === 1 ? "" : "s"} of ${index.stats.valid.toLocaleString("en-US")} portfolios`}
      </p>

      {/* Results */}
      <div className="mt-4" id="results">
        {loading || aiLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Loading results">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : error && !result ? (
          <div className="rounded-2xl border border-dashed border-[var(--surface-border)] p-8 text-center">
            <p className="text-sm font-medium">The directory service did not respond.</p>
            <p className="mt-1 text-sm text-[var(--fa-text-secondary)]">Please try again in a moment.</p>
          </div>
        ) : result && result.items.length === 0 ? (
          <EmptyState
            query={mode === "keyword" ? urlQ : aiQuery}
            onClearFilters={clearAll}
            suggestions={index.technologies.slice(0, 6).map((t) => ({ label: t.label, href: `/technologies/${t.slug}` }))}
          />
        ) : result ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.items.map((p: WirePortfolio) => (
                <PortfolioCard key={p.id} portfolio={p} />
              ))}
            </div>
            {mode === "keyword" && (
              <div className="mt-8">
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  makeHref={(nextPage) =>
                    buildHref(route.path, { ...baseParams(), page: nextPage > 1 ? String(nextPage) : null })
                  }
                  onPageFallback={(nextPage) => {
                    navigateTo(buildHref(route.path, { ...baseParams(), page: nextPage > 1 ? String(nextPage) : null }));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[var(--fa-accent)]/10 pl-2.5 pr-1 text-xs font-medium text-[var(--fa-accent)]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-[var(--fa-accent)]/20"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}
