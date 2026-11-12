/**
 * FolioAtlas — AI-generated portfolio summaries (PRD §7).
 *
 * Grounding rules enforced here:
 *  - The prompt contains ONLY source-supported data (name, verbatim role text,
 *    canonical technologies). The model is instructed never to invent
 *    experience, employment, qualifications or project ownership.
 *  - Output is zod-validated before persistence.
 *  - Persistence uses the service-role client (RLS blocks public writes).
 *  - Summaries are stored in the database and reused (never regenerated per
 *    page view). Regeneration happens when the source entry hash changes or
 *    an authorized refresh is requested; retry/error state is tracked.
 */
import { z } from "zod";
import { requireDbWriter } from "@/lib/supabase/server";
import type { AiSummaryRow } from "@/lib/supabase/types";
import { completeJson, extractJson } from "@/lib/ai/provider";
import { technologyLabel } from "@/lib/portfolio/classify";

export const SummarySchema = z.object({
  summary: z.string().min(20).max(600),
  key_technologies: z.array(z.string().max(40)).max(6).default([]),
  specialties: z.array(z.string().min(2).max(60)).max(5).default([]),
});
export type SummaryPayload = z.infer<typeof SummarySchema>;

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

type SummaryFields = Omit<AiSummaryRow, "id" | "portfolio_id" | "created_at">;

async function persistSummary(portfolioId: string, fields: Partial<SummaryFields>): Promise<void> {
  const { error } = await requireDbWriter()
    .from("portfolio_ai_summaries")
    .upsert(
      { portfolio_id: portfolioId, source_hash: "", ...fields, updated_at: new Date().toISOString() },
      { onConflict: "portfolio_id" }
    );
  if (error) throw new Error(`summary persist failed: ${error.message}`);
}

/**
 * Generate + persist a summary for one portfolio. Failures are recorded with
 * a machine-readable error code; "no-llm-provider" means GROQ_API_KEY is unset.
 * A failure never replaces an existing complete summary (keepExisting).
 */
export async function generateSummaryFor(portfolio: {
  id: string;
  name: string;
  role: string | null;
  portfolioUrl: string;
  technologies: string[];
  sourceEntryHash: string;
  keepExisting?: boolean;
}): Promise<{ status: "complete" | "failed"; errorCode?: string }> {
  const fail = async (errorCode: string) => {
    if (portfolio.keepExisting) return { status: "failed" as const, errorCode };
    await persistSummary(portfolio.id, {
      summary: "",
      source_hash: portfolio.sourceEntryHash,
      status: "failed",
      error_code: errorCode,
    });
    return { status: "failed" as const, errorCode };
  };

  // Grounding rule: nothing reliable to summarize from.
  if (!portfolio.role && portfolio.technologies.length === 0) return fail("insufficient-source-data");

  const { system, user } = buildSummaryPrompt({
    name: portfolio.name,
    role: portfolio.role,
    technologies: portfolio.technologies,
    portfolioHost: safeHost(portfolio.portfolioUrl),
  });

  let result: Awaited<ReturnType<typeof completeJson>>;
  let payload: SummaryPayload;
  try {
    result = await completeJson({ system, user, maxTokens: 450 });
    payload = SummarySchema.parse(extractJson(result.raw));
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "LlmUnavailableError") return { status: "failed", errorCode: "no-llm-provider" };
    return fail(name === "LlmRequestError" ? "llm-request-failed" : "invalid-model-output");
  }

  // Normalize key technologies against the entry's actual canonical techs.
  const known = new Set(portfolio.technologies);
  const keyTechs = payload.key_technologies
    .map((t) => t.toLowerCase().trim())
    .filter((t) => known.has(t))
    .slice(0, 6);

  await persistSummary(portfolio.id, {
    summary: payload.summary,
    key_technologies: keyTechs,
    specialties: payload.specialties.slice(0, 5),
    source_hash: portfolio.sourceEntryHash,
    model: result.model,
    status: "complete",
    generated_at: new Date().toISOString(),
    error_code: null,
  });
  return { status: "complete" };
}

function safeHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}
