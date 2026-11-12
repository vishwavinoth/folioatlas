/**
 * FolioAtlas — tests for the Groq provider: request shape per model family,
 * primary → fallback retry policy, and the AI search intent cache.
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  buildGroqBody,
  completeJson,
  groqFallbackModel,
  groqModel,
  isRetryable,
  LlmRequestError,
  DEFAULT_GROQ_MODEL,
  DEFAULT_GROQ_FALLBACK_MODEL,
} from "../../src/lib/ai/provider";
import { createIntentCache, normalizeQuery } from "../../src/lib/ai/intent-cache";

const saved = { ...process.env };
const realFetch = globalThis.fetch;
beforeEach(() => {
  delete process.env.GROQ_MODEL;
  delete process.env.GROQ_FALLBACK_MODEL;
  process.env.GROQ_API_KEY = "test-key";
});
afterEach(() => {
  process.env = { ...saved };
  globalThis.fetch = realFetch;
});

describe("model selection", () => {
  test("defaults to supported GPT-OSS models", () => {
    expect(groqModel()).toBe(DEFAULT_GROQ_MODEL);
    expect(groqFallbackModel()).toBe(DEFAULT_GROQ_FALLBACK_MODEL);
  });
  test("literal null env values fall back to defaults; off disables the fallback", () => {
    process.env.GROQ_MODEL = "null";
    expect(groqModel()).toBe(DEFAULT_GROQ_MODEL);
    process.env.GROQ_FALLBACK_MODEL = "off";
    expect(groqFallbackModel()).toBeNull();
  });
  test("no fallback when it equals the primary", () => {
    process.env.GROQ_MODEL = "openai/gpt-oss-20b";
    expect(groqFallbackModel()).toBeNull();
  });
});

describe("buildGroqBody", () => {
  test("GPT-OSS gets low reasoning effort, hidden reasoning and extra budget", () => {
    const body = buildGroqBody("openai/gpt-oss-120b", "s", "u", 450);
    expect(body.reasoning_effort).toBe("low");
    expect(body.include_reasoning).toBe(false);
    expect(body).not.toHaveProperty("reasoning_format");
    expect(body.max_completion_tokens as number).toBeGreaterThan(450);
    expect(body.response_format).toEqual({ type: "json_object" });
  });
  test("other models get no reasoning parameters", () => {
    const body = buildGroqBody("some/other-model", "s", "u", 450);
    expect(body).not.toHaveProperty("reasoning_effort");
    expect(body.max_completion_tokens).toBe(450);
  });
});

describe("retry policy", () => {
  test("rate limit, missing model, server and network errors retry; auth/bad request do not", () => {
    for (const status of [404, 408, 429, 500, 503, undefined]) expect(isRetryable(new LlmRequestError("x", "groq", status))).toBe(true);
    for (const status of [400, 401, 403, 413]) expect(isRetryable(new LlmRequestError("x", "groq", status))).toBe(false);
  });

  const ok = (content: string) =>
    new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: "stop" }], usage: {} }), { status: 200 });

  test("falls back to the second model when the first is rate-limited", async () => {
    const models: string[] = [];
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const { model } = JSON.parse(String(init.body));
      models.push(model);
      return model === DEFAULT_GROQ_MODEL ? new Response("slow down", { status: 429 }) : ok('{"a":1}');
    }) as typeof fetch;
    const result = await completeJson({ system: "s", user: "u" });
    expect(models).toEqual([DEFAULT_GROQ_MODEL, DEFAULT_GROQ_FALLBACK_MODEL]);
    expect(result.model).toBe(DEFAULT_GROQ_FALLBACK_MODEL);
  });

  test("does not retry an invalid key", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response("bad key", { status: 401 });
    }) as unknown as typeof fetch;
    await expect(completeJson({ system: "s", user: "u" })).rejects.toThrow("groq-http-401");
    expect(calls).toBe(1);
  });

  test("empty content is a retryable failure", async () => {
    const models: string[] = [];
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const { model } = JSON.parse(String(init.body));
      models.push(model);
      return ok(model === DEFAULT_GROQ_MODEL ? "" : '{"b":2}');
    }) as typeof fetch;
    expect((await completeJson({ system: "s", user: "u" })).raw).toBe('{"b":2}');
    expect(models.length).toBe(2);
  });

  test("without a key nothing is called", async () => {
    delete process.env.GROQ_API_KEY;
    await expect(completeJson({ system: "s", user: "u" })).rejects.toThrow("No LLM provider");
  });
});

describe("intent cache", () => {
  test("normalizes case and whitespace", () => {
    expect(normalizeQuery("  React   Devs ")).toBe("react devs");
  });

  test("shares in-flight and cached values, expires after TTL", async () => {
    let t = 0;
    const cache = createIntentCache<number>({ ttlMs: 1000, now: () => t });
    let loads = 0;
    const load = async () => ++loads;
    expect(cache.peek("q")).toBeNull();
    const a = cache.fill("q", load);
    expect(await cache.peek("Q ")).toBe(1);
    expect(await a).toBe(1);
    t = 2000;
    expect(cache.peek("q")).toBeNull();
    expect(loads).toBe(1);
  });

  test("never caches failures and evicts the oldest entry", async () => {
    const cache = createIntentCache<number>({ maxEntries: 2 });
    await cache.fill("bad", async () => Promise.reject(new Error("x"))).catch(() => {});
    expect(cache.peek("bad")).toBeNull();
    await cache.fill("a", async () => 1);
    await cache.fill("b", async () => 2);
    await cache.fill("c", async () => 3);
    expect(cache.peek("a")).toBeNull();
    expect(cache.size).toBe(2);
  });
});
