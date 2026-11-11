"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * API responses rendered on the server for the current page, keyed by the
 * exact request URL a view would fetch. Lets the first render (and the HTML
 * crawlers receive) contain real content without a client round trip.
 */
export type PrefetchMap = Record<string, unknown>;

const PrefetchContext = createContext<PrefetchMap>({});

export function PrefetchProvider({ value, children }: { value: PrefetchMap; children: ReactNode }) {
  return <PrefetchContext.Provider value={value}>{children}</PrefetchContext.Provider>;
}

export function usePrefetchMap(): PrefetchMap {
  return useContext(PrefetchContext);
}
