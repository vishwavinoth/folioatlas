import { Suspense } from "react";
import type { Metadata } from "next";
import { FolioAtlasApp } from "@/components/folioatlas-app";
import { llmConfigured } from "@/lib/ai/provider";
import { engagementEnabled } from "@/lib/engagement/server";
import { loadClientIndex } from "@/lib/site/index-data";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Served with HTTP 404; the app shell renders its not-found view for the unknown path. */
export default function NotFound() {
  return (
    <Suspense>
      <FolioAtlasApp index={loadClientIndex()} features={{ ai: llmConfigured(), engagement: engagementEnabled() }} />
    </Suspense>
  );
}
