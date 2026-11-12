/**
 * FolioAtlas — server-only LLM provider (Groq, OpenAI-compatible REST).
 *
 * Enabled when GROQ_API_KEY is configured. Models:
 *  - GROQ_MODEL           primary   (default openai/gpt-oss-120b)
 *  - GROQ_FALLBACK_MODEL  secondary (default openai/gpt-oss-20b; "off" disables)
 * The fallback is tried once when the primary is rate-limited, missing or
 * failing. Groq limits are per model, so this also doubles free-tier headroom.
 * Without a key every call throws LlmUnavailableError and AI features degrade
 * to keyword search.
 *
 * Security: keys live exclusively in server env vars; nothing here is ever
 * imported from client code. All JSON responses are validated by callers
 * with zod schemas before use.
 */
import { envValue } from "@/lib/env";

export type LlmProvider = "groq";

export type LlmResult = {
  raw: string;
  model: string;
  provider: LlmProvider;
};

export class LlmUnavailableError extends Error {
  constructor(message = "No LLM provider is configured") {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

export class LlmRequestError extends Error {
  constructor(
    message: string,
    public readonly provider: LlmProvider,
    public readonly status?: number
  ) {
    super(message);
    this.name = "LlmRequestError";
  }
}

const GROQ_API = "https://api.groq.com/openai/v1";
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
export const DEFAULT_GROQ_FALLBACK_MODEL = "openai/gpt-oss-20b";
const ATTEMPT_TIMEOUT_MS = 15_000;
/** Extra completion budget for models that always reason before answering. */
const REASONING_BUDGET = 600;

export function groqConfigured(): boolean {
  return Boolean(envValue("GROQ_API_KEY"));
}

export function groqModel(): string {
  return envValue("GROQ_MODEL") ?? DEFAULT_GROQ_MODEL;
}

export function groqFallbackModel(): string | null {
  const value = envValue("GROQ_FALLBACK_MODEL") ?? DEFAULT_GROQ_FALLBACK_MODEL;
  return value.toLowerCase() === "off" || value === groqModel() ? null : value;
}

export function llmConfigured(): boolean {
  return groqConfigured();
}

const isGptOss = (model: string) => model.startsWith("openai/gpt-oss");

/** Chat-completions body for one model (exported for tests). */
export function buildGroqBody(model: string, system: string, user: string, maxTokens: number): Record<string, unknown> {
  return {
    model,
    temperature: 0.2,
    max_completion_tokens: isGptOss(model) ? maxTokens + REASONING_BUDGET : maxTokens,
    response_format: { type: "json_object" },
    // GPT-OSS always reasons: keep it short and out of the response.
    // (These models reject reasoning_format; see Groq's reasoning docs.)
    ...(isGptOss(model) ? { reasoning_effort: "low", include_reasoning: false } : {}),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
}

/** Errors worth retrying on the other model: rate limit, missing model, server/network failure. */
export function isRetryable(err: LlmRequestError): boolean {
  return err.status === undefined || err.status === 404 || err.status === 408 || err.status === 429 || err.status >= 500;
}

const PROBE_TTL_MS = 10 * 60_000;
let probe: { at: number; ok: Promise<boolean> } | null = null;

/**
 * Whether AI features actually work: the key is set AND Groq lists one of the
 * configured models for it (one cheap request, cached per instance for 10 min).
 * Decides whether AI controls render, so a missing, revoked or mistyped key
 * never leaves non-functional buttons on the site.
 */
export function aiAvailable(): Promise<boolean> {
  if (!groqConfigured()) return Promise.resolve(false);
  if (probe && Date.now() - probe.at < PROBE_TTL_MS) return probe.ok;
  const ok = (async () => {
    try {
      const res = await fetch(`${GROQ_API}/models`, {
        headers: { authorization: `Bearer ${envValue("GROQ_API_KEY")}` },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) {
        console.warn(`[ai] Groq rejected the API key: http-${res.status}; AI features hidden`);
        return false;
      }
      const json = (await res.json()) as { data?: Array<{ id?: string }> };
      const ids = new Set((json.data ?? []).map((m) => m.id));
      const configured = [groqModel(), groqFallbackModel()].filter((m): m is string => Boolean(m));
      const usable = configured.filter((m) => ids.has(m));
      if (usable.length === 0) {
        console.warn(`[ai] none of the configured Groq models are available (${configured.join(", ")}); AI features hidden`);
      } else if (!ids.has(groqModel())) {
        console.warn(`[ai] primary Groq model ${groqModel()} is unavailable; using ${usable[0]}`);
      }
      return usable.length > 0;
    } catch (err) {
      console.warn("[ai] Groq probe failed; AI features hidden:", err instanceof Error ? err.message : err);
      return false;
    }
  })();
  probe = { at: Date.now(), ok };
  return ok;
}

type GroqResponse = {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
};

async function groqComplete(model: string, system: string, user: string, maxTokens: number): Promise<LlmResult> {
  const started = Date.now();
  try {
    const res = await fetch(`${GROQ_API}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${envValue("GROQ_API_KEY")}`,
      },
      body: JSON.stringify(buildGroqBody(model, system, user, maxTokens)),
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new LlmRequestError(`groq-http-${res.status} (${model}): ${body.slice(0, 200)}`, "groq", res.status);
    }
    const json = (await res.json()) as GroqResponse;
    const choice = json.choices?.[0];
    const content = choice?.message?.content ?? "";
    const u = json.usage;
    // Token usage per call, to watch free-tier quota (no user data logged).
    console.info(
      `[ai] ${model} ${Date.now() - started}ms prompt=${u?.prompt_tokens ?? "?"} completion=${u?.completion_tokens ?? "?"} reasoning=${u?.completion_tokens_details?.reasoning_tokens ?? "?"} finish=${choice?.finish_reason ?? "?"}`
    );
    if (!content.trim()) throw new LlmRequestError(`groq-empty-response (${model}, finish=${choice?.finish_reason ?? "?"})`, "groq", 502);
    return { raw: content, model, provider: "groq" };
  } catch (err) {
    if (err instanceof LlmRequestError) throw err;
    throw new LlmRequestError(`groq-failed (${model}): ${(err as Error).message}`, "groq");
  }
}

/**
 * Request a JSON-only completion. Returns the raw string; callers MUST
 * validate with a zod schema before trusting the payload.
 */
export async function completeJson(args: { system: string; user: string; maxTokens?: number }): Promise<LlmResult> {
  if (!groqConfigured()) throw new LlmUnavailableError();
  const maxTokens = args.maxTokens ?? 800;
  const models = [groqModel(), groqFallbackModel()].filter((m): m is string => Boolean(m));
  let lastError: LlmRequestError | null = null;
  for (const model of models) {
    try {
      return await groqComplete(model, args.system, args.user, maxTokens);
    } catch (err) {
      lastError = err as LlmRequestError;
      if (!isRetryable(lastError)) break;
      console.warn(`[ai] ${lastError.message.slice(0, 160)}`);
    }
  }
  throw lastError ?? new LlmRequestError("groq-no-model", "groq");
}

/** Extract the first JSON object from a model response (tolerates prose fences). */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no-json-object-in-response");
  return JSON.parse(candidate.slice(start, end + 1));
}
