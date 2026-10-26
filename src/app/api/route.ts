import { dbReader } from "@/lib/supabase/server";
import { serverError } from "@/lib/server/request";

export const dynamic = "force-dynamic";

/**
 * GET /api — health check. Verifies the Supabase connection with a cheap
 * count query; never exposes configuration values.
 */
export async function GET() {
  try {
    const { count, error } = await dbReader().from("portfolios").select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return Response.json({ status: "ok", portfolios: count ?? 0 }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return serverError("api/health", err, "unhealthy");
  }
}
