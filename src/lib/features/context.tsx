"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Server-decided feature flags (PRD: no controls for features that cannot work). */
export type Features = { ai: boolean };

const FeaturesContext = createContext<Features>({ ai: false });

export function FeaturesProvider({ value, children }: { value: Features; children: ReactNode }) {
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): Features {
  return useContext(FeaturesContext);
}
