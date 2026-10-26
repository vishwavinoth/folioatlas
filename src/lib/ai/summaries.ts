/**
 * FolioAtlas — AI-generated portfolio summaries (PRD §7).
 *
 * Grounding rules enforced here:
 *  - The prompt contains ONLY source-supported data (name, verbatim role text,
 *    canonical technologies). The model is instructed never to invent
 *    experience, employment, qualifications or project ownership.
 *  - Output is zod-validated before persistence.
 *  - Summaries are stored in the database and reused (never regenerated per
 *    page view). Regeneration happens when the source entry hash changes or
 *    an authorized refresh is requested; retry/error state is tracked.
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { completeJson, extractJson } from "@/lib/ai/provider";
import { technologyLabel } from "@/lib/portfolio/classify";

export const SummarySchema = z.object({
  summary: z.string().min(20).max(600),
  key_technologies: z.array(z.string().max(40)).max(6).default([]),
  specialties: z.array(z.string().min(2).max(60)).max(5).default([]),
});
export type SummaryPayload = z.infer<typeof SummarySchema>;

export class SummariesDisabledError extends Error {
  constructor() {
    super("no-llm-provider");
    this.name = "SummariesDisabledError";
  }
}

export function buildSummaryPrompt(input: {
  name: string;
  role: string | null;
  technologies: string[];
  portfolioHost: string;
}): { system: string; user: string } {
  const system = [
    "You write concise, factual portfolio summaries for a developer directory.",
    "STRICT grounding rules:",
    "- Use ONLY the supplied data. Never invent experience, employment history, employers, qualifications, or project ownership.",
    "- If the supplied data is thin, say what little is verifiable and state that details are limited.",
    "- Do not include the person's name in the first sentence more than once. No marketing language.",
    "- 2-3 sentences maximum, plain factual tone.",
    'Respond with JSON ONLY: {"summary":string,"key_technologies":string[],"specialties":string[]}',
    "key_technologies: at most 6 items, drawn from the supplied technologies when possible.",
    "specialties: at most 5 short phrases directly supported by the supplied role text.",
  ].join("\n");

  const user = JSON.stringify({
    name: input.name,
    role_text_supplied_upstream: input.role,
    technologies: input.technologies.map((slug) => technologyLabel(slug)),
    portfolio_host: input.portfolioHost,
  });

  return { system, user };
}

/** Generate + persist a summary for one portfolio. Throws SummariesDisabledError when no LLM exists. */
export async function generateSummaryFor(
  portfolio: {
    id: string;
    name: string;
    role: string | null;
    portfolioUrl: string;
    technologies: string[];
    sourceEntryHash: string;
  },
  opts: { force?: boolean } = {}
): Promise<{ status: "complete" | "failed"; errorCode?: string }> {
  if (!portfolio.role && portfolio.technologies.length === 0) {
    // Grounding rule: nothing reliable to summarize from.
    await db.portfolioAiSummary.upsert({
      where: { portfolioId: portfolio.id },
      create: {
        portfolioId: portfolio.id,
        summary: "",
        sourceHash: portfolio.sourceEntryHash,
        status: "failed",
        errorCode: "insufficient-source-data",
      },
      update: { status: "failed", errorCode: "insufficient-source-data" },
    });
    return { status: "failed", errorCode: "insufficient-source-data" };
  }

  const { system, user } = buildSummaryPrompt({
    name: portfolio.name,
    role: portfolio.role,
    technologies: portfolio.technologies,
    portfolioHost: safeHost(portfolio.portfolioUrl),
  });

  try {
    const result = await completeJson({ system, user, maxTokens: 400 });
    const payload = SummarySchema.parse(extractJson(result.raw));

    // Normalize key technologies against the entry's actual canonical techs.
    const known = new Set(portfolio.technologies);
    const keyTechs = payload.key_technologies
      .map((t) => t.toLowerCase().trim())
      .filter((t) => known.has(t))
      .slice(0, 6);

    await db.portfolioAiSummary.upsert({
      where: { portfolioId: portfolio.id },
      create: {
        portfolioId: portfolio.id,
        summary: payload.summary,
        keyTechnologies: JSON.stringify(keyTechs),
        specialties: JSON.stringify(payload.specialties.slice(0, 5)),
        sourceHash: portfolio.sourceEntryHash,
        model: result.model,
        status: "complete",
        generatedAt: new Date(),
      },
      update: {
        summary: payload.summary,
        keyTechnologies: JSON.stringify(keyTechs),
        specialties: JSON.stringify(payload.specialties.slice(0, 5)),
        sourceHash: portfolio.sourceEntryHash,
        model: result.model,
        status: "complete",
        generatedAt: new Date(),
        errorCode: null,
      },
    });
    return { status: "complete" };
  } catch (err) {
    const code =
      err instanceof Error && err.name === "SummariesDisabledError"
        ? "no-llm-provider"
        : err instanceof Error && err.name === "LlmRequestError"
          ? "llm-request-failed"
          : "invalid-model-output";
    await db.portfolioAiSummary.upsert({
      where: { portfolioId: portfolio.id },
      create: {
        portfolioId: portfolio.id,
        summary: "",
        sourceHash: portfolio.sourceEntryHash,
        status: "failed",
        errorCode: code,
      },
      update: { status: "failed", errorCode: code },
    });
    return { status: "failed", errorCode: code };
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}
