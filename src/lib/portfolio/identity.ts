/**
 * FolioAtlas — deterministic entry identity (PRD §7.3).
 * IDs must be stable across builds: derived from the normalized name + URL,
 * never random UUIDs. Server/build-time only (uses node:crypto).
 */
import { createHash } from "node:crypto";

export function sha1Hex(input: string): string {
  return createHash("sha1").update(input, "utf8").digest("hex");
}

/** ASCII-fold a name into a readable slug (Unicode names degrade gracefully). */
export function nameSlug(name: string): string {
  const folded = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return folded || "portfolio";
}

export function deterministicId(name: string, normalizedUrl: string): string {
  return `${nameSlug(name)}-${sha1Hex(`${name}|${normalizedUrl}`).slice(0, 8)}`;
}
