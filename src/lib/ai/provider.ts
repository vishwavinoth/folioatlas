/**
 * FolioAtlas — server-only LLM provider abstraction.
 *
 * Priority:
 *  1. Groq (OpenAI-compatible REST) when GROQ_API_KEY is configured.
 *     Model is configurable via GROQ_MODEL (default: llama-3.3-70b-versatile,
 *     which supports JSON mode on Groq).
 *  2. z-ai-web-dev-sdk (works in this environment) as a graceful fallback so
 *     AI features degrade to standard search only when NO provider exists.
 *
 * Security: keys live exclusively in server env vars; nothing here is ever
 * imported from client code. All JSON responses are validated by callers
 * with zod schemas before use.
 */

export type LlmProvider = "groq" | "z-ai";

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

async function zaiComplete(system: string, user: string): Promise<LlmResult> {
  try {
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: system },
        { role: "user", content: user },
      ],
      thinking: { type: "disabled" },
    });
    const content = completion.choices[0]?.message?.content ?? "";
    if (!content.trim()) throw new LlmRequestError("zai-empty-response", "z-ai");
    return { raw: content, model: "z-ai-chat", provider: "z-ai" };
  } catch (err) {
    if (err instanceof LlmRequestError) throw err;
    throw new LlmRequestError(`zai-failed: ${(err as Error).message}`, "z-ai");
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
  if (groqConfigured()) return groqComplete(args.system, args.user, maxTokens);
  // In this environment the z-ai SDK is the working provider; when neither
  // provider exists the caller falls back to standard keyword search.
  return zaiComplete(args.system, args.user);
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
