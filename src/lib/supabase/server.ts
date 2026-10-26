/**
 * FolioAtlas — server-side Supabase clients.
 *
 * - reader: publishable (anon) key, so every read is constrained by RLS.
 * - writer: secret (service-role) key, used only for privileged writes.
 *
 * Never import this module from client components: the secret key
 * bypasses Row Level Security.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type Db = SupabaseClient<Database>;

export class DatabaseNotConfiguredError extends Error {
  constructor(missing: string) {
    super(`Supabase is not configured: set ${missing}`);
    this.name = "DatabaseNotConfiguredError";
  }
}

function env(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

// Accept both the documented names and the ones the Vercel ↔ Supabase
// integration provisions automatically.
const supabaseUrl = () => env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = () =>
  env(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY"
  );
const secretKey = () => env("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");

const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { headers: { "x-application-name": "folioatlas" } },
} as const;

let reader: Db | null = null;
let writer: Db | null = null;

export function dbReader(): Db {
  if (reader) return reader;
  const url = supabaseUrl();
  const key = publishableKey();
  if (!url) throw new DatabaseNotConfiguredError("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new DatabaseNotConfiguredError("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  reader = createClient<Database>(url, key, options);
  return reader;
}

/** Privileged client, or null when no service-role key is configured. */
export function dbWriter(): Db | null {
  if (writer) return writer;
  const url = supabaseUrl();
  const key = secretKey();
  if (!url || !key) return null;
  writer = createClient<Database>(url, key, options);
  return writer;
}

/** Same as dbWriter() but throws when unconfigured (for scripts). */
export function requireDbWriter(): Db {
  const client = dbWriter();
  if (!client) throw new DatabaseNotConfiguredError("SUPABASE_URL and SUPABASE_SECRET_KEY");
  return client;
}

/**
 * Read every row of a query, paging past PostgREST's max-rows limit.
 * `build` must return a fresh, ordered query for each page.
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(`supabase query failed: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
