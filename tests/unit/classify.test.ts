/**
 * Unit tests — classification & deterministic identity.
 */
import { describe, expect, test } from "bun:test";
import { classifyRoleText, CLASSIFICATION_RULES } from "../../src/lib/portfolio/classify";
import { deterministicId, nameSlug } from "../../src/lib/portfolio/identity";

describe("classifyRoleText", () => {
  test("classifies from real upstream role text", () => {
    expect(classifyRoleText("Full Stack & Frontend Developer")).toEqual(["full-stack", "frontend"]);
    expect(classifyRoleText("AI Engineer | Full Stack Developer")).toEqual(["full-stack", "ai-ml"]);
    expect(classifyRoleText("WordPress WooCommerce Developer")).toEqual(["wordpress"]);
    expect(classifyRoleText(".Net Developer")).toEqual(["dotnet"]);
    expect(classifyRoleText("Full Stack Developer | Software Engineer")).toEqual(["full-stack"]);
    expect(classifyRoleText("Salesforce Developer")).toEqual(["salesforce"]);
  });

  test("react does not match javascript and vice versa", () => {
    expect(classifyRoleText("JavaScript Developer")).toEqual(["javascript"]);
    expect(classifyRoleText("React & Node.js Developer")).toEqual(["react", "nodejs"]);
  });

  test("java never matches javascript", () => {
    expect(classifyRoleText("JavaScript Engineer")).not.toContain("java");
    expect(classifyRoleText("Java Engineer")).toContain("java");
  });

  test("does not infer from hosting-domain-style words", () => {
    // vercel/github words in role text mean nothing
    expect(classifyRoleText("Deploys on Vercel and GitHub Pages")).toEqual([]);
  });

  test("empty / missing role text stays unclassified", () => {
    expect(classifyRoleText(null)).toEqual([]);
    expect(classifyRoleText("")).toEqual([]);
    expect(classifyRoleText("   ")).toEqual([]);
  });

  test("classification rules are unique by slug and documented", () => {
    const slugs = CLASSIFICATION_RULES.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const r of CLASSIFICATION_RULES) {
      expect(r.label.length).toBeGreaterThan(0);
      expect(r.blurb.length).toBeGreaterThan(0);
      expect(r.patterns.length).toBeGreaterThan(0);
    }
  });
});

describe("deterministicId", () => {
  test("stable across calls", () => {
    const a = deterministicId("Aaaabad Ahmed", "https://sawad.framer.website");
    const b = deterministicId("Aaaabad Ahmed", "https://sawad.framer.website");
    expect(a).toBe(b);
  });

  test("differs for same name different URL (same-name people)", () => {
    const a = deterministicId("Same Name", "https://samename-one.example.io");
    const b = deterministicId("Same Name", "https://samename-two.example.io");
    expect(a).not.toBe(b);
  });

  test("differs for different names same URL", () => {
    const a = deterministicId("Alice", "https://site.example.io");
    const b = deterministicId("Bob", "https://site.example.io");
    expect(a).not.toBe(b);
  });

  test("slug degrades gracefully for unicode names", () => {
    expect(nameSlug("Aaweł Szostak")).toBe("aawe-szostak");
    expect(nameSlug("®©")).toBe("portfolio");
  });

  test("format: slug-8hex", () => {
    expect(deterministicId("Ada Lovelace", "https://ada.dev")).toMatch(/^[a-z0-9-]+-[0-9a-f]{8}$/);
  });
});
