/**
 * Unit tests — search, filtering, sorting, pagination (PRD §9).
 */
import { describe, expect, test } from "bun:test";
import {
  buildSearchFields,
  filterPortfolios,
  letterCounts,
  matchesQuery,
  paginate,
  sortPortfolios,
} from "../../src/lib/portfolio/directory";
import type { Portfolio } from "../../src/lib/portfolio/types";

const P = (id: string, name: string, url: string, extra: Partial<Portfolio> = {}): Portfolio => ({
  id,
  name,
  url,
  letter: name[0].toUpperCase(),
  source: { repository: "emmabostian/developer-portfolios", file: "README.md" },
  ...extra,
});

const data: Portfolio[] = [
  P("a1", "Aaaabad Ahmed", "https://sawad.framer.website", { description: "Software Engineer" }),
  P("a2", "Aftab Vijapura", "https://aaftab.is-a.dev", { description: "Full Stack & Frontend Developer", technologies: ["full-stack", "frontend"] }),
  P("b1", "Budi Santoso", "https://github.com/budi", { technologies: ["full-stack"] }),
  P("c1", "Charlie Chen", "https://charlie.dev/Portfolio"),
  P("c2", "Cara Dev", "https://cara.github.io/my-site"),
];

const fields = new Map(data.map((p) => [p.id, buildSearchFields(p)]));

describe("matchesQuery", () => {
  test("case-insensitive name match", () => {
    expect(matchesQuery(buildSearchFields(data[0]), "aaaabad")).toBe(true);
    expect(matchesQuery(buildSearchFields(data[0]), "AAAABAD")).toBe(true);
  });

  test("URL and domain search", () => {
    expect(matchesQuery(buildSearchFields(data[0]), "sawad.framer")).toBe(true);
    expect(matchesQuery(buildSearchFields(data[0]), "framer.website")).toBe(true);
  });

  test("description search", () => {
    expect(matchesQuery(buildSearchFields(data[1]), "full stack")).toBe(true);
  });

  test("whitespace normalization", () => {
    expect(matchesQuery(buildSearchFields(data[1]), "  full   stack  ")).toBe(true);
  });

  test("multi-token queries require every token", () => {
    expect(matchesQuery(buildSearchFields(data[1]), "vijapura frontend")).toBe(true);
    expect(matchesQuery(buildSearchFields(data[1]), "vijapura backend")).toBe(false);
  });

  test("no match returns false", () => {
    expect(matchesQuery(buildSearchFields(data[0]), "zzz-not-there")).toBe(false);
  });

  test("empty query matches everything", () => {
    expect(matchesQuery(buildSearchFields(data[0]), "")).toBe(true);
    expect(matchesQuery(buildSearchFields(data[0]), "   ")).toBe(true);
  });
});

describe("filterPortfolios", () => {
  test("by letter", () => {
    const out = filterPortfolios(data, fields, { q: "", letter: "C", technology: null });
    expect(out.map((p) => p.id).sort()).toEqual(["c1", "c2"]);
  });

  test("by technology", () => {
    const out = filterPortfolios(data, fields, { q: "", letter: null, technology: "frontend" });
    expect(out.map((p) => p.id)).toEqual(["a2"]);
  });

  test("by query", () => {
    const out = filterPortfolios(data, fields, { q: "budi", letter: null, technology: null });
    expect(out.map((p) => p.id)).toEqual(["b1"]);
  });

  test("combined filters intersect", () => {
    const out = filterPortfolios(data, fields, { q: "", letter: "B", technology: "full-stack" });
    expect(out.map((p) => p.id)).toEqual(["b1"]);
  });
});

describe("sortPortfolios", () => {
  test("A–Z and Z–A deterministic", () => {
    const asc = sortPortfolios(data, "name-asc").map((p) => p.name);
    expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)));
    const desc = sortPortfolios(data, "name-desc").map((p) => p.name);
    expect(desc[0]).toBe("Charlie Chen");
    expect([...desc].reverse()).toEqual(asc);
  });
});

describe("paginate", () => {
  const many: Portfolio[] = Array.from({ length: 55 }, (_, i) => P(`p${i}`, `Dev ${String(i).padStart(2, "0")}`, `https://d${i}.dev`));

  test("page boundaries with no duplicates or gaps", () => {
    const p1 = paginate(many, 1);
    expect(p1.items.length).toBe(24);
    expect(p1.totalPages).toBe(3);
    const p2 = paginate(many, 2);
    expect(p2.items.length).toBe(24);
    const p3 = paginate(many, 3);
    expect(p3.items.length).toBe(7);
    const seen = new Set([...p1.items, ...p2.items, ...p3.items].map((p) => p.id));
    expect(seen.size).toBe(55);
  });

  test("clamps out-of-range pages", () => {
    expect(paginate(many, 0).page).toBe(1);
    expect(paginate(many, 99).page).toBe(3);
  });

  test("empty result set yields one empty page", () => {
    const p = paginate([], 1);
    expect(p.total).toBe(0);
    expect(p.totalPages).toBe(1);
    expect(p.items).toEqual([]);
  });
});

describe("letterCounts", () => {
  test("counts per letter", () => {
    const counts = letterCounts(data);
    expect(counts["A"]).toBe(2);
    expect(counts["B"]).toBe(1);
    expect(counts["C"]).toBe(2);
    expect(counts["D"]).toBeUndefined();
  });
});
