import { llmsTxt } from "@/lib/site/llms";

export const dynamic = "force-static";

/** GET /llms.txt — site map for AI assistants (https://llmstxt.org). */
export function GET() {
  return new Response(llmsTxt(), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
