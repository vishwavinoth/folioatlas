/**
 * FolioAtlas — tests for preview provider resolution and derived GitHub
 * identity. Both are data-honesty surfaces: no fabricated URLs, no leaked
 * credentials, clearly labeled inference.
 */
import { describe, test, expect } from "bun:test";
import { resolvePreview, activeProvider, type PreviewProvider } from "../../src/lib/server/preview";
import { deriveGithubUsername } from "../../src/lib/portfolio/github";

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) {
    saved[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  try {
    fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

describe("preview provider resolution", () => {
  test("defaults to a credential-free public provider", () => {
    withEnv({ SCREENSHOT_ONE_ACCESS_KEY: undefined, PREVIEW_PROVIDER: undefined }, () => {
      expect(activeProvider()).toBe<PreviewProvider>("mshots");
      const res = resolvePreview("https://example.com/portfolio");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.provider).toBe("mshots");
        expect(res.imageUrl).toContain(encodeURIComponent("https://example.com/portfolio"));
        expect(res.imageUrl).not.toContain("access_key");
      }
    });
  });

  test("screenshotone provider receives the access key server-side", () => {
    withEnv({ SCREENSHOT_ONE_ACCESS_KEY: "sk-test-123", PREVIEW_PROVIDER: undefined }, () => {
      const res = resolvePreview("https://example.com");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.provider).toBe("screenshotone");
        expect(res.imageUrl).toContain("access_key=sk-test-123");
      }
    });
  });

  test("previews can be explicitly disabled", () => {
    withEnv({ PREVIEW_PROVIDER: "none" }, () => {
      const res = resolvePreview("https://example.com");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("disabled");
    });
  });

  test("rejects non-http URLs", () => {
    expect(resolvePreview("javascript:alert(1)").ok).toBe(false);
    expect(resolvePreview("ftp://example.com").ok).toBe(false);
  });
});

describe("github identity derivation", () => {
  test("derives the username from a github.io subdomain", () => {
    expect(deriveGithubUsername("https://emmabostian.github.io/")).toEqual({
      username: "emmabostian",
      source: "inferred-domain",
    });
  });

  test("ignores www and pages subdomains", () => {
    expect(deriveGithubUsername("https://www.github.io").username).toBeNull();
    expect(deriveGithubUsername("https://pages.github.io").username).toBeNull();
  });

  test("never infers from non-github.io domains", () => {
    expect(deriveGithubUsername("https://yashahire.info").username).toBeNull();
    expect(deriveGithubUsername("https://github.com/someone").source).toBe("none");
  });

  test("handles malformed URLs safely", () => {
    expect(deriveGithubUsername("not a url").username).toBeNull();
  });
});
