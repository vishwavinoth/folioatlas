/**
 * FolioAtlas — deterministic README parser (PRD §7.4).
 *
 * Built against the ACTUAL upstream format of emmabostian/developer-portfolios:
 *   ## A
 *   - [Name](https://example.com) [Software Engineer]
 *   - [Name](https://example.com)
 *
 * The parser is intentionally conservative: it recognizes the real patterns,
 * recovers from the one known malformation (space between ] and () with a
 * warning, and quarantines anything it cannot interpret unambiguously.
 */

export type RawEntry = {
  name: string;
  rawUrl: string;
  /** Role/label text supplied in square brackets after the URL, if any. */
  roleText: string | null;
  letter: string;
  line: number;
  /** e.g. "strict" | "lenient-spacing" */
  matchQuality: "strict" | "lenient";
};

export type ParseResult = {
  entries: RawEntry[];
  warnings: string[];
  linesScanned: number;
};

// Section headings are exactly one letter: "## A" … "## Z"
const SECTION_RE = /^##\s*([A-Za-z])\s*$/;
// Standard entry: - [Name](url) [optional role]
const STRICT_RE = /^-\s*\[([^\]]+)\]\(\s*([^)\s]+)\s*\)\s*(.*)$/;
// Known upstream malformation: - [Name] (url) — space between ] and (
const LENIENT_RE = /^-\s*\[([^\]]+)\]\s+\(\s*([^)\s]+)\s*\)\s*(.*)$/;
// Bracket groups in the trailing text, e.g. "[Software Engineer]" or "[A] [B]"
const BRACKET_GROUP_RE = /\[([^\[\]]+)\]/g;

/** Strip zero-width / bidi control characters that could spoof rendering. */
function stripInvisible(text: string): string {
  return text.replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/gu, "").trim();
}

export function parseReadme(markdown: string): ParseResult {
  const lines = markdown.split(/\r?\n/);
  const entries: RawEntry[] = [];
  const warnings: string[] = [];
  let currentLetter: string | null = null;
  let sawSection = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];

    const section = line.match(SECTION_RE);
    if (section) {
      currentLetter = section[1].toUpperCase();
      sawSection = true;
      continue;
    }

    // Ignore everything before the first letter section (intro, jump list, images)
    if (!sawSection) continue;
    if (!line.trim().startsWith("-")) continue;

    const strict = line.match(STRICT_RE);
    const lenient = strict ? null : line.match(LENIENT_RE);
    const match = strict ?? lenient;
    if (!match) {
      // A list item inside a letter section that is not a portfolio entry —
      // record it for manual review rather than guessing.
      warnings.push(`line ${lineNo}: unrecognized list item — "${line.trim().slice(0, 120)}"`);
      continue;
    }

    const name = stripInvisible(match[1]);
    let rawUrl = match[2].trim();
    const rest = match[3];

    if (!name) {
      warnings.push(`line ${lineNo}: empty name — skipped`);
      continue;
    }
    if (!rawUrl) {
      warnings.push(`line ${lineNo}: empty URL — skipped`);
      continue;
    }

    // Recover from unencoded quote typos inside URLs (real upstream case).
    if (rawUrl.includes('"')) {
      rawUrl = rawUrl.replace(/"/g, "");
      warnings.push(`line ${lineNo}: unencoded quotes stripped from URL — "${name}"`);
    }

    // Remove secondary markdown links in the trailing text, e.g. "[Repo](https://…)"
    // — they are extra links, never role text.
    const restNoLinks = rest.replace(/\[[^\[\]]*\]\([^)]*\)/g, (m) => {
      warnings.push(`line ${lineNo}: secondary link ignored — "${m.slice(0, 80)}"`);
      return " ";
    });

    // Extract remaining bracket groups as the supplied role/description text.
    const groups: string[] = [];
    let nonBracket = stripInvisible(restNoLinks).replace(BRACKET_GROUP_RE, (_m, g1: string) => {
      const g = stripInvisible(g1);
      if (g) groups.push(g);
      return " ";
    });
    // Drop punctuation-only leftovers (e.g. "*******", stray "[") — formatting noise.
    nonBracket = nonBracket.replace(/[\p{P}\p{S}\s]+/gu, " ").trim();

    let roleText: string | null = null;
    if (groups.length > 0) {
      roleText = groups.join(" | ");
    } else if (nonBracket) {
      roleText = nonBracket;
      warnings.push(`line ${lineNo}: description without brackets — "${nonBracket.slice(0, 80)}"`);
    }

    entries.push({
      name,
      rawUrl,
      roleText: roleText && roleText.trim() ? roleText.trim() : null,
      letter: currentLetter ?? "?",
      line: lineNo,
      matchQuality: strict ? "strict" : "lenient",
    });

    if (lenient) {
      warnings.push(`line ${lineNo}: recovered with lenient spacing — "${name}"`);
    }
  }

  if (!sawSection) {
    warnings.push("no alphabetical sections found — upstream format may have changed");
  }

  return { entries, warnings, linesScanned: lines.length };
}
