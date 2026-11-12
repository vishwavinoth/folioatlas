/**
 * FolioAtlas — per-instance cache of validated AI search intents.
 *
 * The same questions (example chips, shared links, double submits) are asked
 * over and over; caching the validated intent spares the LLM quota. Concurrent
 * identical queries share one in-flight request. Failures are never cached.
 */
export type CacheOptions = { ttlMs?: number; maxEntries?: number; now?: () => number };

export function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/\s+/g, " ").trim();
}

export function createIntentCache<T>({ ttlMs = 6 * 60 * 60_000, maxEntries = 500, now = Date.now }: CacheOptions = {}) {
  const entries = new Map<string, { at: number; value: Promise<T> }>();

  return {
    /** Cached value for the query, or null (no LLM call). */
    peek(query: string): Promise<T> | null {
      const key = normalizeQuery(query);
      const hit = entries.get(key);
      if (!hit) return null;
      if (now() - hit.at > ttlMs) {
        entries.delete(key);
        return null;
      }
      // Refresh recency (Map keeps insertion order → oldest first).
      entries.delete(key);
      entries.set(key, hit);
      return hit.value;
    },
    /** Run load() for the query and cache the result once it resolves. */
    fill(query: string, load: () => Promise<T>): Promise<T> {
      const key = normalizeQuery(query);
      const value = load();
      entries.set(key, { at: now(), value });
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value as string);
      value.catch(() => {
        if (entries.get(key)?.value === value) entries.delete(key);
      });
      return value;
    },
    get size() {
      return entries.size;
    },
  };
}
