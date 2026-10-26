/**
 * FolioAtlas — server-only LLM provider abstraction.
 *
 * Groq (OpenAI-compatible REST) when GROQ_API_KEY is configured. The model
 * is configurable via GROQ_MODEL (default: llama-3.3-70b-versatile, which
 * supports JSON mode on Groq). Without a key every call throws
 * LlmUnavailableError and AI features degrade to keyword search.
 *
 * Security: keys live exclusively in server env vars; nothing here is ever
 * imported from client code. All JSON responses are validated by callers
 * with zod schemas before use.
 */

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

export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export function groqModel(): string {
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}

export function llmConfigured(): boolean {
  return groqConfigured();
}

async function groqComplete(system: string, user: string, maxTokens: number): Promise<LlmResult> {
  const key = process.env.GROQ_API_KEY as string;
  const model = groqModel();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_completion_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new LlmRequestError(`groq-http-${res.status}: ${body.slice(0, 200)}`, "groq", res.status);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    if (!content.trim()) throw new LlmRequestError("groq-empty-response", "groq");
    return { raw: content, model, provider: "groq" };
  } catch (err) {
    if (err instanceof LlmRequestError) throw err;
    throw new LlmRequestError(`groq-failed: ${(err as Error).message}`, "groq");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Request a JSON-only completion. Returns the raw string; callers MUST
 * validate with a zod schema before trusting the payload.
 */
export async function completeJson(args: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<LlmResult> {
  const maxTokens = args.maxTokens ?? 800;
  if (!groqConfigured()) throw new LlmUnavailableError();
  return groqComplete(args.system, args.user, maxTokens);
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
