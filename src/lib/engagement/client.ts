"use client";

/**
 * FolioAtlas — browser-side engagement store.
 *
 * - Counts are fetched in batches (one request per render pass, not per card)
 *   and shared by every component showing the same portfolio.
 * - "Liked" state and an anonymous random visitor ID live in localStorage
 *   (no cookies). The server only ever stores a salted hash of the ID.
 * - Views/visits are fire-and-forget beacons, sent at most once per page load.
 */
import { useEffect, useSyncExternalStore } from "react";
import type { EngagementCounts } from "@/lib/api-types";

const VID_KEY = "fa_vid";
const LIKED_KEY = "fa_liked";
const BATCH_DELAY_MS = 30;

const counts = new Map<string, EngagementCounts>();
const inflight = new Set<string>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
const tracked = new Set<string>();
let liked: Set<string> | null = null;
let memoryVid: string | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode): state lasts for this page only */
  }
}

/** Random anonymous ID; persisted when storage is available. */
export function visitorId(): string {
  const stored = safeGet(VID_KEY);
  if (stored) return stored;
  memoryVid ??= crypto.randomUUID();
  safeSet(VID_KEY, memoryVid);
  return memoryVid;
}

function likedSet(): Set<string> {
  if (!liked) {
    try {
      const parsed = JSON.parse(safeGet(LIKED_KEY) ?? "[]");
      liked = new Set(Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : []);
    } catch {
      liked = new Set();
    }
  }
  return liked;
}

function persistLiked() {
  safeSet(LIKED_KEY, JSON.stringify([...likedSet()].slice(-2000)));
}

async function flush() {
  flushTimer = null;
  const slugs = [...pending];
  pending.clear();
  for (let i = 0; i < slugs.length; i += 100) {
    const chunk = slugs.slice(i, i + 100);
    try {
      const res = await fetch(`/api/engagement?slugs=${chunk.join(",")}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`http-${res.status}`);
      const json = (await res.json()) as { counts: Record<string, EngagementCounts> };
      for (const [slug, c] of Object.entries(json.counts)) counts.set(slug, c);
    } catch {
      /* counts are decorative: leave them unknown */
    } finally {
      for (const slug of chunk) inflight.delete(slug);
    }
  }
  notify();
}

function request(slug: string) {
  if (counts.has(slug) || inflight.has(slug)) return;
  inflight.add(slug);
  pending.add(slug);
  flushTimer ??= setTimeout(flush, BATCH_DELAY_MS);
}

/** All-time counts for a portfolio (null until loaded). */
export function useEngagement(slug: string, enabled = true): EngagementCounts | null {
  useEffect(() => {
    if (enabled) request(slug);
  }, [slug, enabled]);
  return useSyncExternalStore(
    subscribe,
    () => counts.get(slug) ?? null,
    () => null
  );
}

export function useLiked(slug: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => likedSet().has(slug),
    () => false
  );
}

export type LikeOutcome = "liked" | "unliked" | "daily-limit" | "failed";

/** Optimistically toggle a like, then reconcile with the server's count. */
export async function toggleLike(slug: string): Promise<LikeOutcome> {
  const set = likedSet();
  const next = !set.has(slug);
  const before = counts.get(slug);
  if (next) set.add(slug);
  else set.delete(slug);
  if (before) counts.set(slug, { ...before, likes: Math.max(0, before.likes + (next ? 1 : -1)) });
  persistLiked();
  notify();

  const revert = () => {
    if (next) set.delete(slug);
    else set.add(slug);
    if (before) counts.set(slug, before);
    persistLiked();
    notify();
  };

  try {
    const res = await fetch("/api/reactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, vid: visitorId(), liked: next }),
    });
    const json = (await res.json().catch(() => ({}))) as { liked?: boolean; likes?: number; error?: string };
    if (!res.ok) {
      revert();
      return json.error === "daily-limit" || json.error === "rate-limited" ? "daily-limit" : "failed";
    }
    const current = counts.get(slug) ?? { likes: 0, views: 0, visits: 0 };
    counts.set(slug, { ...current, likes: json.likes ?? current.likes });
    if (json.liked) set.add(slug);
    else set.delete(slug);
    persistLiked();
    notify();
    return json.liked ? "liked" : "unliked";
  } catch {
    revert();
    return "failed";
  }
}

/** Count a detail-page view or a click through to the portfolio site. */
export function track(slug: string, kind: "view" | "visit") {
  const key = `${kind}:${slug}`;
  if (tracked.has(key)) return;
  tracked.add(key);
  const body = JSON.stringify({ slug, kind, vid: visitorId() });
  try {
    if (navigator.sendBeacon?.("/api/engagement", new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* fall through to fetch */
  }
  void fetch("/api/engagement", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(
    () => undefined
  );
}

/** Compact number for counters: 950, 1.2k, 12k. */
export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(n / 1000)}k`;
}
