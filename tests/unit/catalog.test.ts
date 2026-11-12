/**
 * FolioAtlas — tests for the server catalog: the exact search / filter /
 * sort / ranking semantics served by /api/search, /api/stats and AI search.
 */
import { describe, test, expect } from "bun:test";
import {
  buildCatalog,
  collectionCounts,
  featuredPortfolios,
  intentSearch,
  relatedPortfolios,
  searchCatalog,
  technologyCounts,
  type SearchParamsInput,
} from "../../src/lib/store/catalog";
import type { AiSummaryRow, PortfolioRow } from "../../src/lib/supabase/types";

const NOW = Date.parse("2026-10-26T12:00:00Z");

function row(id: string, over: Partial<PortfolioRow> = {}): PortfolioRow {
  return {
    id,
    slug: id,
    name: id,
    github_username: null,
    github_profile_url: null,
    github_source: "none",
    portfolio_url: `https://${id}.dev/`,
    avatar_url: null,
    role: null,
    description: null,
    technologies: [],
    letter: id[0].toUpperCase(),
    source_section: id[0].toUpperCase(),
    source_repository: "emmabostian/developer-portfolios",
    source_line: null,
    source_entry_hash: `hash-${id}`,
    first_seen_at: "2020-01-01T00:00:00Z",
    last_seen_at: "2026-10-01T00:00:00Z",
    source_updated_at: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...over,
  };
}

function summary(portfolioId: string, over: Partial<AiSummaryRow> = {}): AiSummaryRow {
  return {
    id: `s-${portfolioId}`,
    portfolio_id: portfolioId,
    summary: "A grounded summary of the supplied role text.",
    key_technologies: ["react"],
    specialties: [],
    source_hash: "h",
    model: "test-model",
    status: "complete",
    generated_at: "2026-10-10T00:00:00Z",
    error_code: null,
    created_at: "2026-10-10T00:00:00Z",
    updated_at: "2026-10-10T00:00:00Z",
    ...over,
  };
}

const catalog = buildCatalog(
  [
    row("carol", { name: "Carol", role: "Frontend Engineer", technologies: ["react", "frontend"] }),
    row("alice", { name: "Alice", role: "Full Stack Developer", technologies: ["react", "full-stack"] }),
    row("bob", {
      name: "Bob",
      role: "React Native developer",
      technologies: ["react-native", "mobile"],
      portfolio_url: "https://github.com/bob",
      first_seen_at: "2026-10-20T00:00:00Z",
    }),
    row("dave", {
      name: "dave",
      role: "ML Engineer",
      technologies: ["ai-ml", "python", "backend"],
      github_source: "inferred-domain",
      github_username: "dave",
      portfolio_url: "https://dave.github.io/",
    }),
  ],
  [summary("alice"), summary("carol", { status: "failed", summary: "" })]
);

const params = (over: Partial<SearchParamsInput> = {}): SearchParamsInput => ({
  q: "",
  tech: [],
  collection: null,
  letter: null,
  site: "any",
  hasSummary: false,
  addedWithinDays: null,
  sort: "name-asc",
  page: 1,
  pageSize: 24,
  ...over,
});

const names = (items: { name: string }[]) => items.map((p) => p.name);

describe("buildCatalog", () => {
  test("sorts by name case-insensitively and attaches only complete summaries", () => {
    expect(catalog.map((e) => e.wire.name)).toEqual(["Alice", "Bob", "Carol", "dave"]);
    const alice = catalog[0].wire;
    expect(alice.hasAiSummary).toBe(true);
    expect(alice.aiSummary?.model).toBe("test-model");
    const carol = catalog[2].wire;
    expect(carol.hasAiSummary).toBe(false);
    expect(carol.aiSummary).toBeUndefined();
  });

  test("normalizes timestamps to ISO strings", () => {
    expect(catalog[0].wire.firstSeenAt).toBe("2020-01-01T00:00:00.000Z");
  });
});

describe("searchCatalog filters", () => {
  test("technology filter uses exact slugs with AND semantics", () => {
    expect(names(searchCatalog(catalog, params({ tech: ["react"] }), NOW).items)).toEqual(["Alice", "Carol"]);
    expect(names(searchCatalog(catalog, params({ tech: ["react", "frontend"] }), NOW).items)).toEqual(["Carol"]);
  });

  test("query tokens must all hit name, role, URL or an exact technology", () => {
    expect(names(searchCatalog(catalog, params({ q: "engineer" }), NOW).items)).toEqual(["Carol", "dave"]);
    expect(names(searchCatalog(catalog, params({ q: "ml engineer" }), NOW).items)).toEqual(["dave"]);
    expect(names(searchCatalog(catalog, params({ q: "PYTHON" }), NOW).items)).toEqual(["dave"]);
    expect(searchCatalog(catalog, params({ q: "nobody" }), NOW).total).toBe(0);
  });

  test("site filter separates GitHub-hosted from own domains", () => {
    expect(names(searchCatalog(catalog, params({ site: "github" }), NOW).items)).toEqual(["Bob"]);
    expect(names(searchCatalog(catalog, params({ site: "own" }), NOW).items)).toEqual(["Alice", "Carol", "dave"]);
  });

  test("letter, summary and recency filters", () => {
    expect(names(searchCatalog(catalog, params({ letter: "d" }), NOW).items)).toEqual(["dave"]);
    expect(names(searchCatalog(catalog, params({ hasSummary: true }), NOW).items)).toEqual(["Alice"]);
    expect(names(searchCatalog(catalog, params({ addedWithinDays: 30 }), NOW).items)).toEqual(["Bob"]);
  });
});

describe("searchCatalog sorting + pagination", () => {
  test("name-desc and newest", () => {
    expect(names(searchCatalog(catalog, params({ sort: "name-desc" }), NOW).items)).toEqual([
      "dave",
      "Carol",
      "Bob",
      "Alice",
    ]);
    expect(names(searchCatalog(catalog, params({ sort: "newest" }), NOW).items)[0]).toBe("Bob");
  });

  test("relevance scores role and technology hits, ties broken by name", () => {
    // Bob: role contains "react" (+20) and slug "react-native" contains it (+25).
    const result = searchCatalog(catalog, params({ q: "react", sort: "relevance" }), NOW);
    expect(names(result.items)).toEqual(["Bob", "Alice", "Carol"]);
    expect(names(searchCatalog(catalog, params({ q: "dave", sort: "relevance" }), NOW).items)).toEqual(["dave"]);
  });

  test("pages are clamped to the available range", () => {
    const result = searchCatalog(catalog, params({ pageSize: 3, page: 9 }), NOW);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(names(result.items)).toEqual(["dave"]);
  });
});

describe("discovery helpers", () => {
  test("related portfolios rank by shared technologies, then fill alphabetically", () => {
    const carol = catalog.find((e) => e.wire.slug === "carol")!.wire;
    expect(names(relatedPortfolios(catalog, carol, 2))).toEqual(["Alice", "Bob"]);
  });

  test("technology counts and collections are real unions", () => {
    const react = technologyCounts(catalog).find((t) => t.slug === "react");
    expect(react?.count).toBe(2);
    for (const c of collectionCounts(catalog)) {
      const expected = catalog.filter((e) => c.techSlugs.some((t) => e.wire.technologies.includes(t))).length;
      expect(c.count).toBe(expected);
    }
  });

  test("featured requires role text, github.io authorship and ≥2 focus areas", () => {
    expect(names(featuredPortfolios(catalog, 4))).toEqual(["dave"]);
  });
});

describe("intentSearch", () => {
  test("requires every technology and every keyword, excludes terms", () => {
    const matches = intentSearch(catalog, { technologies: ["react"], keywords: ["engineer"], exclusions: [] });
    expect(matches.map((m) => m.portfolio.name)).toEqual(["Carol"]);
    expect(matches[0].matchedTechnologies).toEqual(["react"]);
    expect(matches[0].matchedKeywords).toEqual(["engineer"]);

    const excluded = intentSearch(catalog, { technologies: ["react"], keywords: [], exclusions: ["frontend"] });
    expect(excluded.map((m) => m.portfolio.name)).toEqual(["Alice"]);
  });
});

describe("mapSummary staleness", () => {
  const row = {
    id: "s1", portfolio_id: "p1", summary: "A grounded summary of twenty chars+.", key_technologies: [], specialties: [],
    source_hash: "h1", model: "m", status: "complete", generated_at: "2026-11-01T00:00:00Z", error_code: null,
    created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z",
  } as AiSummaryRow;
  test("current when the source hash matches, stale when the entry changed", async () => {
    const { mapSummary } = await import("../../src/lib/store/catalog");
    expect(mapSummary(row, "h1")?.stale).toBe(false);
    expect(mapSummary(row, "h2")?.stale).toBe(true);
    expect(mapSummary({ ...row, status: "failed" }, "h1")).toBeNull();
  });
});
