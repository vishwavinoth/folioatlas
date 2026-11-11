import { llmsFullTxt } from "@/lib/site/llms";

export const dynamic = "force-static";

/** GET /llms-full.txt — the complete directory as Markdown for AI assistants. */
export function GET() {
  return new Response(llmsFullTxt(), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
