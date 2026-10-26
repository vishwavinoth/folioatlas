/**
 * FolioAtlas — URL validation and normalization (PRD §7.5).
 *
 * External URLs are untrusted data. Only http/https web URLs are accepted;
 * schemes like javascript:, data:, file: are rejected outright, as are URLs
 * carrying embedded credentials or pointing at private/loopback hosts.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

export type UrlValidationResult =
  | { ok: true; url: string; key: string; hashDropped: boolean }
  | { ok: false; reason: string };

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/**
 * Validate and normalize a raw URL string.
 * Normalization policy (deliberately conservative, per PRD §7.5):
 *  - lowercase protocol + hostname (URL parser does this)
 *  - strip default ports (:80, :443)
 *  - strip a single trailing "/" from the path (root "/" kept)
 *  - drop the hash fragment (recorded, not silently lost)
 *  - never touch path casing or segments
 */
export function validateAndNormalizeUrl(rawInput: string): UrlValidationResult {
  const raw = rawInput.trim();
  if (!raw) return { ok: false, reason: "empty-url" };

  // Reject control characters / whitespace inside the URL
  if (/[\s<>"]/u.test(raw)) return { ok: false, reason: "invalid-characters" };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "unparseable" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: `unsupported-scheme:${parsed.protocol.replace(":", "")}` };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: "credentials-in-url" };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host) return { ok: false, reason: "missing-host" };
  if (BLOCKED_HOSTNAMES.has(host) || isPrivateIpv4(host)) {
    return { ok: false, reason: "private-or-loopback-host" };
  }
  if (!host.includes(".") && !host.includes(":") && host !== "[::1]" && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    // No dot and no port/ipv6 → suspicious single-label host (e.g. "mynode")
    return { ok: false, reason: "single-label-host" };
  }

  let hashDropped = false;
  if (parsed.hash) {
    hashDropped = true;
    parsed.hash = "";
  }

  // Strip default ports
  if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
    parsed.port = "";
  }

  // Strip trailing slash from path (keep root "/" as empty path)
  let path = parsed.pathname;
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  parsed.pathname = path;

  // Drop empty query
  if (parsed.search === "?" || parsed.search === "") parsed.search = "";

  const url = parsed.toString();
  // Deduplication key: full normalized URL (not just domain — different paths
  // are different portfolios, e.g. two github.io sites under one host).
  const key = url.toLowerCase();

  return { ok: true, url, key, hashDropped };
}
