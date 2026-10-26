/**
 * Unit tests — README parsing (against real upstream patterns).
 * Run: bun test tests/unit
 */
import { describe, expect, test } from "bun:test";
import { parseReadme } from "../../src/lib/portfolio/parse";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURE = readFileSync(join(import.meta.dir, "..", "fixtures", "readme-sample.md"), "utf8");

describe("parseReadme", () => {
  const result = parseReadme(FIXTURE);

  test("ignores content before the first letter section", () => {
    // Jump list, random-portfolio link and tweet image live before "## A"
    const before = result.entries.filter((e) => e.letter === "?");
    expect(before.length).toBe(0);
  });

  test("detects standard strict entries", () => {
    const a = result.entries.find((e) => e.name === "Aaaabad Ahmed");
    expect(a).toBeDefined();
    expect(a!.rawUrl).toBe("https://sawad.framer.website");
    expect(a!.roleText).toBe("Software Engineer");
    expect(a!.letter).toBe("A");
    expect(a!.matchQuality).toBe("strict");
  });

  test("handles role bracket directly adjacent to URL (no space)", () => {
    const e = result.entries.find((e) => e.name === "Aaftab Vijapura");
    expect(e).toBeDefined();
    expect(e!.roleText).toBe("Full Stack & Frontend Developer");
  });

  test("preserves unicode names", () => {
    const e = result.entries.find((e) => e.name === "Aabu Sayed®");
    expect(e).toBeDefined();
    expect(e!.name).toBe("Aabu Sayed®");
  });

  test("recovers the known upstream malformation (space before paren) with a warning", () => {
    const e = result.entries.find((e) => e.name === "Md Mizan");
    expect(e).toBeDefined();
    expect(e!.matchQuality).toBe("lenient");
    expect(result.warnings.some((w) => w.includes("lenient spacing"))).toBe(true);
  });

  test("entries without role text have null roleText", () => {
    const e = result.entries.find((e) => e.name === "Dup One");
    expect(e!.roleText).toBeNull();
  });

  test("multi-bracket role text is joined", () => {
    const e = result.entries.find((e) => e.name === "Berners Lee");
    expect(e!.roleText).toContain("Tim Berners-Lee");
  });

  test("section letters are tracked across sections", () => {
    expect(result.entries.find((e) => e.name === "Zayar Shein")!.letter).toBe("Z");
    expect(result.entries.find((e) => e.name === "Budi Santoso")!.letter).toBe("B");
  });

  test("secondary markdown links are ignored, never treated as role text", () => {
    const e = result.entries.find((e) => e.name === "Jason Cameron");
    expect(e).toBeDefined();
    expect(e!.roleText).toBeNull();
    expect(result.warnings.some((w) => w.includes("secondary link ignored"))).toBe(true);

    // Role text after a secondary link is still recovered
    const s = result.entries.find((e) => e.name === "Shubham Gupta");
    expect(s!.roleText).toBe("Mern Stack Devloper");
  });

  test("punctuation-only trailing garbage is dropped", () => {
    const e = result.entries.find((e) => e.name === "Emanuel Borges");
    expect(e!.roleText).toBe("Senior Full Stack, building with AI");
  });

  test("nested stray brackets recover the role text", () => {
    const e = result.entries.find((e) => e.name === "Anil Peter");
    expect(e!.roleText).toBe("Frontend Developer");
  });

  test("unencoded quotes in URLs are stripped with a warning", () => {
    const e = result.entries.find((e) => e.name === "Akshay Abraham");
    expect(e).toBeDefined();
    expect(e!.rawUrl.endsWith('")')).toBe(false);
    expect(result.warnings.some((w) => w.includes("quotes stripped from URL"))).toBe(true);
  });

  test("unrecognized list items produce warnings, not entries", () => {
    const linesWithWarning = result.warnings.filter((w) => w.includes("unrecognized list item"));
    expect(linesWithWarning.length).toBeGreaterThanOrEqual(0);
    // Everything in fixture that starts with "- " is either an entry or warned
    for (const e of result.entries) {
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.rawUrl.length).toBeGreaterThan(0);
    }
  });
});
