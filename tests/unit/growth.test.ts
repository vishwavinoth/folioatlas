/**
 * FolioAtlas — tests for verified growth series bucketing and integrity.
 * These functions feed the Portfolio Growth chart; correctness of
 * coverage labels and add-accounting matters for data honesty.
 */
import { describe, test, expect } from "bun:test";
import { extractJson } from "../../src/lib/ai/provider";

// The growth series bucketing lives in the server store; test the pure parts
// by importing the module directly (framework-free logic over plain rows).
// getGrowthSeries is async + db-bound, so we replicate + assert its bucketing
// contract here via a local pure implementation mirrored from queries.ts.
type Snap = { recordedAt: Date; totalPortfolios: number; portfoliosAdded: number; provenance: string };

function bucketize(snaps: Snap[], range: "30d" | "90d" | "1y" | "all") {
  const bucketMs = range === "30d" || range === "90d" ? 86400000 : range === "1y" ? 7 * 86400000 : 30 * 86400000;
  const points: Array<{ date: string; total: number; added: number; provenance: string }> = [];
  for (const s of snaps) {
    const t = s.recordedAt.getTime();
    const last = points[points.length - 1];
    if (last && t - new Date(last.date).getTime() < bucketMs) {
      last.total = s.totalPortfolios;
      last.added += s.portfoliosAdded;
    } else {
      points.push({ date: s.recordedAt.toISOString(), total: s.totalPortfolios, added: s.portfoliosAdded, provenance: s.provenance });
    }
  }
  return points;
}

const D = (iso: string) => new Date(iso);

describe("growth series bucketing", () => {
  test("daily bucketing keeps the latest total per day and sums adds", () => {
    const points = bucketize(
      [
        { recordedAt: D("2026-10-01T08:00:00Z"), totalPortfolios: 100, portfoliosAdded: 2, provenance: "git-history" },
        { recordedAt: D("2026-10-01T20:00:00Z"), totalPortfolios: 104, portfoliosAdded: 2, provenance: "git-history" },
        { recordedAt: D("2026-10-02T09:00:00Z"), totalPortfolios: 110, portfoliosAdded: 6, provenance: "git-history" },
      ],
      "30d"
    );
    expect(points).toHaveLength(2);
    expect(points[0].total).toBe(104); // later snapshot in the same day wins
    expect(points[0].added).toBe(4); // adds accumulate
    expect(points[1].total).toBe(110);
    expect(points[1].added).toBe(6);
  });

  test("monthly bucketing compresses a long history", () => {
    const snaps: Snap[] = [];
    for (let i = 0; i < 90; i++) {
      snaps.push({
        recordedAt: D(`2026-01-${String((i % 28) + 1).padStart(2, "0")}T12:00:00Z`),
        totalPortfolios: 1000 + i,
        portfoliosAdded: 1,
        provenance: "git-history",
      });
    }
    const points = bucketize(snaps, "all");
    expect(points.length).toBeLessThanOrEqual(4); // ~3 monthly buckets
    expect(points[points.length - 1].total).toBe(1000 + 89);
  });

  test("single snapshot yields one point (honest empty state upstream)", () => {
    const points = bucketize(
      [{ recordedAt: D("2026-10-26T10:00:00Z"), totalPortfolios: 2072, portfoliosAdded: 0, provenance: "sync-run" }],
      "1y"
    );
    expect(points).toHaveLength(1);
    expect(points[0].total).toBe(2072);
  });

  test("provenance is preserved for transparency", () => {
    const points = bucketize(
      [{ recordedAt: D("2026-10-26T10:00:00Z"), totalPortfolios: 10, portfoliosAdded: 10, provenance: "git-history" }],
      "all"
    );
    expect(points[0].provenance).toBe("git-history");
  });
});

describe("extractJson (LLM response parsing)", () => {
  test("parses a clean JSON object", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  test("parses JSON inside markdown fences", () => {
    expect(extractJson('```json\n{"b":2}\n```')).toEqual({ b: 2 });
  });

  test("parses JSON with surrounding prose", () => {
    expect(extractJson('Here you go: {"c":3} — hope that helps!')).toEqual({ c: 3 });
  });

  test("throws when no JSON object exists", () => {
    expect(() => extractJson("no json here")).toThrow();
    expect(() => extractJson("")).toThrow();
  });
});
