import { Suspense } from "react";
import type { Metadata } from "next";
import { FolioAtlasApp } from "@/components/folioatlas-app";
import { aiAvailable } from "@/lib/ai/provider";
import { engagementEnabled } from "@/lib/engagement/server";
import { loadClientIndex } from "@/lib/site/index-data";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Served with HTTP 404; the app shell renders its not-found view for the unknown path. */
export default async function NotFound() {
  return (
    <Suspense>
      <FolioAtlasApp index={loadClientIndex()} features={{ ai: await aiAvailable(), engagement: engagementEnabled() }} />
    </Suspense>
  );
}
