"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

export function useApi<T>(url: string | null, opts: { refreshKey?: string } = {}): FetchState<T> {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>(() => ({
    data: null,
    loading: Boolean(url),
    error: null,
  }));
  const abortRef = useRef<AbortController | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  // Render-time adjustment (React-recommended pattern): reset state when the
  // request identity changes, instead of calling setState inside an effect.
  const [prevKey, setPrevKey] = useState(`${url ?? ""}|${tick}|${opts.refreshKey ?? ""}`);
  const nextKey = `${url ?? ""}|${tick}|${opts.refreshKey ?? ""}`;
  if (prevKey !== nextKey) {
    setPrevKey(nextKey);
    setState({ data: null, loading: Boolean(url), error: null });
  }

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    abortRef.current = controller;
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
        if (!cancelled) setState({ data: json, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof Error && err.name === "AbortError")) return;
        setState({ data: null, loading: false, error: err instanceof Error ? err.message : "request-failed" });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, tick, opts.refreshKey]);

  return { ...state, refetch };
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
