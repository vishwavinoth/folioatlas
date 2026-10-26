/**
 * FolioAtlas — AI search intent parsing (PRD §6).
 *
 * A natural-language query is converted by the LLM into a TYPED intent which
 * is validated against the canonical technology vocabulary BEFORE any database
 * query runs. The model can only choose from the supplied canonical slugs —
 * it can never invent developer records or technologies.
 */
import { z } from "zod";

export const SearchIntentSchema = z.object({
  /** Canonical technology slugs (subset of the vocabulary given in the prompt). */
  technologies: z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).max(5).default([]),
  /** Free-text keywords to match against name/role text (case-folded). */
  keywords: z.array(z.string().min(1).max(40)).max(6).default([]),
  /** Terms the user explicitly does not want. */
  exclusions: z.array(z.string().min(1).max(40)).max(3).default([]),
  /** Short restatement of what the user is looking for (for the UI). */
  interpretation: z.string().min(1).max(200),
  /** Model self-assessed confidence 0–1; display-only. */
  confidence: z.number().min(0).max(1).default(0.5),
});
export type SearchIntent = z.infer<typeof SearchIntentSchema>;

export function buildIntentPrompt(userQuery: string, technologies: Array<{ slug: string; label: string; count: number }>): {
  system: string;
  user: string;
} {
  const vocab = technologies
    .map((t) => `${t.slug} (${t.count} portfolios)`)
    .join(", ");

  const system = [
    "You translate a user's portfolio-search request into a strict JSON search intent.",
    "Rules:",
    "- technologies: ONLY slugs from the provided vocabulary. Never invent slugs.",
    "- keywords: lowercase free-text terms to find in developer role text or names (e.g. \"api\", \"cloud\", \"design systems\").",
    "- exclusions: terms the user explicitly rejects.",
    "- interpretation: one short sentence restating the request.",
    "- confidence: 0-1 self-assessment of how well you understood the request.",
    '- Respond with JSON ONLY matching: {"technologies":string[],"keywords":string[],"exclusions":string[],"interpretation":string,"confidence":number}',
    "If the request is not about finding developers or portfolios, return empty arrays and explain that in interpretation.",
    "Do NOT fabricate developer names, portfolios, or facts about people.",
  ].join("\n");

  const user = `Technology vocabulary: ${vocab}\n\nUser request: ${JSON.stringify(userQuery)}`;
  return { system, user };
}

/**
 * Validate + sanitize a raw model response into a safe intent.
 * Unknown technology slugs are dropped (never passed to SQL).
 */
export function validateIntent(raw: unknown, knownSlugs: Set<string>): SearchIntent {
  const parsed = SearchIntentSchema.parse(raw);
  const technologies = [...new Set(parsed.technologies)]
    .filter((slug) => knownSlugs.has(slug))
    .map((slug) => slug.toLowerCase())
    .slice(0, 5);
  const fold = (arr: string[]) =>
    [...new Set(arr.map((k) => k.toLowerCase().trim()).filter(Boolean))].slice(0, 6);
  return {
    technologies,
    keywords: fold(parsed.keywords),
    exclusions: fold(parsed.exclusions),
    interpretation: parsed.interpretation.trim().slice(0, 200),
    confidence: parsed.confidence,
  };
}

export type IntentQueryPlan = {
  /** slugs for SQL containment (AND-ed = must match ALL) */
  technologies: string[];
  keywords: string[];
  exclusions: string[];
};

/** Build the actual database query plan from a validated intent. */
export function planFromIntent(intent: SearchIntent): IntentQueryPlan {
  return {
    technologies: intent.technologies,
    keywords: intent.keywords.filter((k) => !intent.technologies.includes(k)),
    exclusions: intent.exclusions,
  };
}
