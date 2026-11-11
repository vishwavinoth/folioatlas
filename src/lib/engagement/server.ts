/**
 * FolioAtlas — server-side engagement: anonymous, deduplicated portfolio
 * views, site visits and likes (server only; never import from client code).
 *
 * Identity is a random visitor ID from the browser's localStorage, stored
 * only as an HMAC. IPs are hashed together with the UTC day for same-day
 * abuse caps and are never stored in plain text. Disabled (feature hidden)
 * unless ENGAGEMENT_SALT and the Supabase secret key are configured.
 */
import { createHmac } from "node:crypto";
import { dbReader, dbWriter } from "@/lib/supabase/server";
import type { EngagementCountRow } from "@/lib/supabase/types";

export type EngagementCounts = { likes: number; views: number; visits: number };
export type EventKind = "view" | "visit";

/** Max new likes per network per UTC day, and max counted events. */
export const LIKE_DAILY_CAP = 60;
export const EVENT_DAILY_CAP = 1500;

export const VISITOR_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BOT_RE =
  /bot|crawl|spider|slurp|preview|fetch|scrape|headless|lighthouse|pingdom|monitor|uptime|curl|wget|python-requests|httpclient|axios|node-fetch/i;

function salt(): string | null {
  const value = process.env.ENGAGEMENT_SALT?.trim();
  return value && value.length >= 16 ? value : null;
}

export function engagementEnabled(): boolean {
  return Boolean(salt() && dbWriter());
}

function hmac(input: string): string {
  const key = salt();
  if (!key) throw new Error("ENGAGEMENT_SALT is not configured");
  return createHmac("sha256", key).update(input).digest("hex");
}

export function visitorHash(visitorId: string): string {
  return hmac(`visitor:${visitorId.toLowerCase()}`);
}

/** Rotates daily: usable for same-day caps only, never to track across days. */
export function ipHash(ip: string, now: Date = new Date()): string {
  return hmac(`ip:${ip}:${now.toISOString().slice(0, 10)}`);
}

/** Automated clients never count as views, visits or likes. */
export function isAutomated(userAgent: string | null): boolean {
  return !userAgent || BOT_RE.test(userAgent);
}

const toCounts = (row: EngagementCountRow): EngagementCounts => ({
  likes: Number(row.likes) || 0,
  views: Number(row.views) || 0,
  visits: Number(row.visits) || 0,
});

/** All-time counts keyed by portfolio id (reads aggregate-only function). */
export async function getCounts(ids: string[]): Promise<Map<string, EngagementCounts>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await dbReader().rpc("engagement_counts", { p_ids: ids.slice(0, 200) });
  if (error) throw new Error(`engagement_counts failed: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.portfolio_id, toCounts(row)]));
}

export type RankedRow = EngagementCounts & { portfolioId: string };

export async function getRanking(from: Date, to: Date, metric: "likes" | "views", limit = 50): Promise<RankedRow[]> {
  const { data, error } = await dbReader().rpc("engagement_leaderboard", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_metric: metric,
    p_limit: limit,
  });
  if (error) throw new Error(`engagement_leaderboard failed: ${error.message}`);
  return (data ?? []).map((row) => ({ portfolioId: row.portfolio_id, ...toCounts(row) }));
}

export type ReactionResult = { liked: boolean; likes: number; capped: boolean };

export async function setReaction(portfolioId: string, visitorId: string, ip: string, liked: boolean): Promise<ReactionResult> {
  const writer = dbWriter();
  if (!writer) throw new Error("engagement writes are not configured");
  const { data, error } = await writer.rpc("record_reaction", {
    p_portfolio_id: portfolioId,
    p_visitor_hash: visitorHash(visitorId),
    p_ip_hash: ipHash(ip),
    p_liked: liked,
    p_daily_cap: LIKE_DAILY_CAP,
  });
  if (error) throw new Error(`record_reaction failed: ${error.message}`);
  const row = data?.[0];
  return { liked: Boolean(row?.liked), likes: Number(row?.likes) || 0, capped: Boolean(row?.capped) };
}

export async function recordEvent(portfolioId: string, kind: EventKind, visitorId: string, ip: string): Promise<boolean> {
  const writer = dbWriter();
  if (!writer) return false;
  const { data, error } = await writer.rpc("record_event", {
    p_portfolio_id: portfolioId,
    p_kind: kind,
    p_visitor_hash: visitorHash(visitorId),
    p_ip_hash: ipHash(ip),
    p_daily_cap: EVENT_DAILY_CAP,
  });
  if (error) throw new Error(`record_event failed: ${error.message}`);
  return Boolean(data);
}
