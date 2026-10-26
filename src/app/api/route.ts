import { dbReader } from "@/lib/supabase/server";
import { serverError } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api — health check. Verifies the Supabase connection with a cheap
 * count query; never exposes configuration values.
 */
export async function GET() {
  try {
    // A GET (not HEAD) so a missing table surfaces as an error instead of a silent empty count.
    const { count, error, status } = await dbReader().from("portfolios").select("id", { count: "exact" }).limit(1);
    if (error || status >= 400) throw new Error(error?.message || `supabase responded ${status}`);
    return Response.json({ status: "ok", portfolios: count ?? 0 }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return serverError("api/health", err, "unhealthy");
  }
}
