/**
 * Unit tests — URL validation & normalization (PRD §7.5).
 */
import { describe, expect, test } from "bun:test";
import { validateAndNormalizeUrl } from "../../src/lib/portfolio/url";

describe("validateAndNormalizeUrl", () => {
  test("accepts https and http", () => {
    expect(validateAndNormalizeUrl("https://a.dev").ok).toBe(true);
    expect(validateAndNormalizeUrl("http://a.dev").ok).toBe(true);
  });

  test("rejects dangerous schemes", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "ftp://x.com"]) {
      const r = validateAndNormalizeUrl(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/unsupported-scheme/);
    }
  });

  test("rejects credentials embedded in URLs", () => {
    const r = validateAndNormalizeUrl("https://user:pass@example.com");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("credentials-in-url");
  });

  test("rejects private / loopback hosts", () => {
    for (const bad of ["http://localhost:3000", "http://127.0.0.1", "http://192.168.1.10", "http://10.0.0.5", "http://172.16.0.9"]) {
      expect(validateAndNormalizeUrl(bad).ok).toBe(false);
    }
  });

  test("rejects unparseable input", () => {
    expect(validateAndNormalizeUrl("example.com/page").ok).toBe(false);
    expect(validateAndNormalizeUrl("").ok).toBe(false);
    expect(validateAndNormalizeUrl("https://").ok).toBe(false);
  });

  test("normalizes host to lowercase and strips default ports", () => {
    const r = validateAndNormalizeUrl("HTTPS://GitHub.COM:443/budi");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe("https://github.com/budi");
  });

  test("strips trailing slash but never path segments", () => {
    const r = validateAndNormalizeUrl("https://a.dev/portfolio/");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe("https://a.dev/portfolio");
    const root = validateAndNormalizeUrl("https://a.dev/");
    if (root.ok) expect(root.url).toBe("https://a.dev/");
  });

  test("drops hash fragments and reports it", () => {
    const r = validateAndNormalizeUrl("https://zero.example.com#section");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url).toBe("https://zero.example.com/");
      expect(r.hashDropped).toBe(true);
    }
  });

  test("preserves meaningful path casing and segments", () => {
    const r = validateAndNormalizeUrl("https://a.dev/My-Portfolio/Page-1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe("https://a.dev/My-Portfolio/Page-1");
  });

  test("different paths under one domain are NOT duplicates", () => {
    const a = validateAndNormalizeUrl("https://me.github.io/site-a");
    const b = validateAndNormalizeUrl("https://me.github.io/site-b");
    if (a.ok && b.ok) expect(a.key).not.toBe(b.key);
  });
});
