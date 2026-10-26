/**
 * FolioAtlas — tests for AI search-intent validation and query planning.
 * The intent layer is the security boundary between the LLM and the database:
 * unknown slugs must be dropped, output shapes clamped.
 */
import { describe, test, expect } from "bun:test";
import { SearchIntentSchema, validateIntent, planFromIntent, buildIntentPrompt } from "../../src/lib/ai/search-intent";

const KNOWN = new Set(["nextjs", "react", "ai-ml", "backend", "python"]);

describe("SearchIntentSchema", () => {
  test("accepts a valid intent and applies defaults", () => {
    const parsed = SearchIntentSchema.parse({
      technologies: ["nextjs"],
      keywords: ["ai"],
      interpretation: "find nextjs developers",
      confidence: 0.9,
    });
    expect(parsed.exclusions).toEqual([]);
    expect(parsed.technologies).toEqual(["nextjs"]);
  });

  test("rejects malformed slugs", () => {
    const bad = SearchIntentSchema.safeParse({
      technologies: ["NEXT JS!"],
      keywords: [],
      interpretation: "x",
    });
    expect(bad.success).toBe(false);
  });

  test("rejects oversized arrays", () => {
    const bad = SearchIntentSchema.safeParse({
      technologies: Array.from({ length: 10 }, (_, i) => `tech-${i}`),
      keywords: [],
      interpretation: "x",
    });
    expect(bad.success).toBe(false);
  });
});

describe("validateIntent", () => {
  test("drops unknown technology slugs (LLM cannot invent vocabulary)", () => {
    const intent = validateIntent(
      { technologies: ["nextjs", "quantum-computing-xyz"], keywords: ["api"], exclusions: [], interpretation: "i", confidence: 0.5 },
      KNOWN
    );
    expect(intent.technologies).toEqual(["nextjs"]);
  });

  test("folds keyword case and deduplicates", () => {
    const intent = validateIntent(
      { technologies: [], keywords: ["API", "api ", "Cloud"], exclusions: [], interpretation: "i", confidence: 0.5 },
      KNOWN
    );
    expect(intent.keywords).toEqual(["api", "cloud"]);
  });

  test("throws on structurally invalid model output", () => {
    expect(() => validateIntent({ nope: true }, KNOWN)).toThrow();
    expect(() => validateIntent("not an object", KNOWN)).toThrow();
  });
});

describe("planFromIntent", () => {
  test("removes keywords that duplicate technologies", () => {
    const plan = planFromIntent({
      technologies: ["nextjs"],
      keywords: ["nextjs", "ai"],
      exclusions: [],
      interpretation: "i",
      confidence: 0.5,
    });
    expect(plan.keywords).toEqual(["ai"]);
    expect(plan.technologies).toEqual(["nextjs"]);
  });
});

describe("buildIntentPrompt", () => {
  test("constrains the model to the canonical vocabulary", () => {
    const { system, user } = buildIntentPrompt("find react devs", [
      { slug: "react", label: "React", count: 59 },
      { slug: "ai-ml", label: "AI / ML", count: 264 },
    ]);
    expect(system).toContain("ONLY slugs from the provided vocabulary");
    expect(user).toContain("react (59 portfolios)");
    expect(user).toContain("find react devs");
  });
});
