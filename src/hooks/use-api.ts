"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrefetchMap } from "./prefetch-context";

/**
 * Minimal data-fetching hook with abort handling and explicit states.
 * Deliberately dependency-free: the app fetches a handful of stable
 * endpoints, so a TanStack Query dependency is not warranted.
 */
export type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-run the request (e.g. after a mutation that changes the payload). */
  refetch: () => void;
};

type ApiState<T> = { data: T | null; loading: boolean; error: string | null; seededKey: string | null };

export function useApi<T>(url: string | null, opts: { refreshKey?: string } = {}): FetchState<T> {
  const prefetch = usePrefetchMap();
  const [tick, setTick] = useState(0);
  const key = `${url ?? ""}|${tick}|${opts.refreshKey ?? ""}`;

  // Server-rendered data for this exact URL (skipped after an explicit refetch).
  const seedFor = (k: string): ApiState<T> =>
    url && tick === 0 && Object.prototype.hasOwnProperty.call(prefetch, url)
      ? { data: prefetch[url] as T, loading: false, error: null, seededKey: k }
      : { data: null, loading: Boolean(url), error: null, seededKey: null };

  const [state, setState] = useState<ApiState<T>>(() => seedFor(key));
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  // Render-time adjustment (React-recommended pattern): reset state when the
  // request identity changes, instead of calling setState inside an effect.
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    setState(seedFor(key));
  }

  const seeded = state.seededKey === key;
  useEffect(() => {
    if (!url || seeded) return;
    const controller = new AbortController();
    let cancelled = false;

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `http-${res.status}`);
        }
        return res.json() as Promise<T>;
      })
      .then((json) => {
        if (!cancelled) setState({ data: json, loading: false, error: null, seededKey: null });
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof Error && err.name === "AbortError")) return;
        setState({ data: null, loading: false, error: err instanceof Error ? err.message : "request-failed", seededKey: null });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, tick, opts.refreshKey, seeded]);

  return { data: state.data, loading: state.loading, error: state.error, refetch };
}

/** Debounce any rapidly-changing value (search input → API URL). */
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
