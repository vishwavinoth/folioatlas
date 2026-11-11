"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Server-decided feature flags (PRD: no controls for features that cannot work). */
export type Features = {
  /** AI search + summaries (GROQ_API_KEY). */
  ai: boolean;
  /** Likes, views, visits and the leaderboard (ENGAGEMENT_SALT + Supabase secret key). */
  engagement: boolean;
};

const FeaturesContext = createContext<Features>({ ai: false, engagement: false });

export function FeaturesProvider({ value, children }: { value: Features; children: ReactNode }) {
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): Features {
  return useContext(FeaturesContext);
}
