/**
 * FolioAtlas — portfolio synchronization pipeline (PRD §7.2, §7.8, §7.9).
 *
 * Fetch upstream README → parse → normalize → validate → deduplicate →
 * classify → generate versioned artifacts atomically.
 *
 * Usage:  bun scripts/sync-portfolios.ts [--check]
 * Env:    GITHUB_TOKEN (optional read-only), UPSTREAM_OWNER, UPSTREAM_REPO,
 *         UPSTREAM_REF, UPSTREAM_README_PATH
 *         (not GITHUB_*: GitHub Actions sets GITHUB_REF to this repo's own branch)
 */
import { parseReadme } from "../src/lib/portfolio/parse";
import { validateAndNormalizeUrl } from "../src/lib/portfolio/url";
import { classifyRoleText, technologyLabel } from "../src/lib/portfolio/classify";
import { deterministicId, sha1Hex } from "../src/lib/portfolio/identity";
import type { Portfolio, PortfolioIndex, SyncReport, TechnologyCategory } from "../src/lib/portfolio/types";
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const OUT_INDEX = join(ROOT, "src", "data", "portfolios.generated.json");
const OUT_REPORT = join(ROOT, "src", "data", "sync-report.generated.json");
const SCHEMA_VERSION = 1;

const OWNER = process.env.UPSTREAM_OWNER || "emmabostian";
const REPO = process.env.UPSTREAM_REPO || "developer-portfolios";
const README_PATH = process.env.UPSTREAM_README_PATH || "README.md";
const REPOSITORY = `${OWNER}/${REPO}`;
const CHECK_MODE = process.argv.includes("--check");

function backoffDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 8000);
}

async function fetchWithRetries(url: string, init: RequestInit, attempts = 3, timeoutMs = 20000): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 200) return res;
      // 404 is definitive for raw content; retrying will not change it.
      if (res.status === 404) throw new Error(`upstream-404: ${url}`);
      if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
        throw new Error("github-rate-limited");
      }
      lastError = new Error(`upstream-http-${res.status}`);
    } catch (err) {
      lastError = err;
      if (err instanceof Error && (err.message === "upstream-404: " + url)) throw err;
    }
    if (attempt < attempts - 1) {
      await new Promise((r) => setTimeout(r, backoffDelay(attempt)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("fetch-failed");
}

/** Resolve the upstream default branch when UPSTREAM_REF is not set (PRD §8.2). */
async function resolveRef(): Promise<string> {
  if (process.env.UPSTREAM_REF) return process.env.UPSTREAM_REF;
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const res = await fetchWithRetries(`https://api.github.com/repos/${REPOSITORY}`, { headers }, 2);
    const meta = (await res.json()) as { default_branch?: string };
    if (meta.default_branch) return meta.default_branch;
  } catch {
    // API unavailable/rate-limited → fall back to documented known branch.
  }
  return "master";
}

async function resolveCommit(ref: string): Promise<string | null> {
  try {
    const proc = Bun.spawnSync(["git", "ls-remote", `https://github.com/${REPOSITORY}`, ref]);
    const out = proc.stdout.toString().trim();
    const sha = out.split(/\s+/)[0];
    return /^[0-9a-f]{40}$/.test(sha) ? sha : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const branch = await resolveRef();

  // The upstream README is public: fetch it without credentials. A token that
  // is not valid for the upstream repository (e.g. the Actions GITHUB_TOKEN,
  // scoped to this repo) makes raw.githubusercontent.com answer 404.
  const rawUrl = `https://raw.githubusercontent.com/${REPOSITORY}/${branch}/${README_PATH}`;
  let markdown: string;
  try {
    const res = await fetchWithRetries(rawUrl, {});
    markdown = await res.text();
  } catch (err) {
    // PRD §14: a failed sync must NOT erase a previously valid index.
    if (existsSync(OUT_INDEX)) {
      console.error(`[sync] FAILED to fetch upstream (${(err as Error).message}). Keeping existing artifact untouched.`);
      process.exit(CHECK_MODE ? 1 : 2);
    }
    console.error(`[sync] FAILED to fetch upstream and no existing artifact present: ${(err as Error).message}`);
    process.exit(1);
  }

  const commit = await resolveCommit(branch);
  const parsed = parseReadme(markdown);

  // ── Validate + normalize + deduplicate ────────────────────────────────
  const quarantined: SyncReport["quarantined"] = [];
  const duplicateCollisions: SyncReport["duplicateCollisions"] = [];
  const warnings = [...parsed.warnings];
  const seenByUrl = new Map<string, { name: string }>();
  const seenById = new Set<string>();
  const portfolios: Portfolio[] = [];
  let hashDrops = 0;

  for (const entry of parsed.entries) {
    const verdict = validateAndNormalizeUrl(entry.rawUrl);
    if (!verdict.ok) {
      quarantined.push({ line: entry.line, raw: `- [${entry.name}](${entry.rawUrl})`, reason: verdict.reason });
      continue;
    }
    if (verdict.hashDropped) hashDrops += 1;

    const existing = seenByUrl.get(verdict.key);
    if (existing) {
      // Policy (PRD §7.6): one normalized URL = one portfolio. Keep the FIRST
      // occurrence; report the collision instead of silently dropping.
      duplicateCollisions.push({ url: verdict.url, keptName: existing.name, droppedName: entry.name });
      continue;
    }

    let id = deterministicId(entry.name, verdict.url);
    while (seenById.has(id)) {
      // Astronomically unlikely (sha1 prefix), but stay deterministic.
      id = `${id}-${sha1Hex(id).slice(0, 4)}`;
    }
    seenById.add(id);

    const technologies = classifyRoleText(entry.roleText);
    const portfolio: Portfolio = {
      id,
      name: entry.name,
      url: verdict.url,
      ...(entry.roleText ? { description: entry.roleText } : {}),
      ...(technologies.length > 0 ? { technologies } : {}),
      letter: /^[A-Z]/.test(entry.letter) ? entry.letter : (entry.name.trim()[0]?.toUpperCase() ?? "#"),
      source: { repository: REPOSITORY, file: README_PATH, line: entry.line },
    };
    seenByUrl.set(verdict.key, { name: entry.name });
    portfolios.push(portfolio);
  }

  if (hashDrops > 0) warnings.push(`${hashDrops} URL hash fragment(s) dropped during normalization`);

  // Sanity: name should roughly match its section letter (informational only).
  const letterMismatches = portfolios.filter(
    (p) => (p.name.trim()[0] ?? "").toUpperCase() !== p.letter
  ).length;
  if (letterMismatches > 0) {
    warnings.push(`${letterMismatches} entr(ies) whose initial does not match the upstream section letter`);
  }

  // ── Technology index ──────────────────────────────────────────────────
  const counts = new Map<string, number>();
  let classified = 0;
  let withDescription = 0;
  for (const p of portfolios) {
    if (p.description) withDescription += 1;
    if (p.technologies && p.technologies.length > 0) {
      classified += 1;
      for (const slug of p.technologies) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  const technologies: TechnologyCategory[] = [...counts.entries()]
    .map(([slug, count]) => ({ slug, label: technologyLabel(slug), count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));

  const stats: SyncReport["stats"] = {
    linesScanned: parsed.linesScanned,
    entriesDetected: parsed.entries.length,
    valid: portfolios.length,
    duplicatesRemoved: duplicateCollisions.length,
    quarantined: quarantined.length,
    withDescription,
    classified,
    nameCollisionsKept: 0,
  };

  // Safety gate (PRD §14): never replace a good artifact with an empty list.
  if (existsSync(OUT_INDEX) && portfolios.length === 0) {
    console.error("[sync] parsed 0 valid entries — refusing to replace existing artifact.");
    process.exit(CHECK_MODE ? 1 : 2);
  }
  if (existsSync(OUT_INDEX)) {
    try {
      const prev = JSON.parse(readFileSync(OUT_INDEX, "utf8")) as PortfolioIndex;
      if (prev.portfolios.length > 0 && portfolios.length < prev.portfolios.length * 0.5) {
        console.error(
          `[sync] parsed ${portfolios.length} valid entries vs ${prev.portfolios.length} previously — drop >50%. Refusing to publish. Parser may be stale vs upstream format.`
        );
        process.exit(CHECK_MODE ? 1 : 2);
      }
    } catch {
      warnings.push("previous artifact unreadable — overwritten");
    }
  }

  const generatedAt = new Date().toISOString();
  const index: PortfolioIndex = {
    schemaVersion: SCHEMA_VERSION,
    source: { repository: REPOSITORY, file: README_PATH, branch, commit },
    generatedAt,
    stats: { ...stats, nameCollisionsKept: 0 },
    technologies,
    portfolios,
  };
  const report: SyncReport = {
    schemaVersion: SCHEMA_VERSION,
    source: { repository: REPOSITORY, file: README_PATH, branch, commit },
    generatedAt,
    stats: { ...stats, nameCollisionsKept: 0 },
    warnings,
    quarantined,
    duplicateCollisions,
    technologies,
  };

  // ── Atomic publish (PRD §7.8): tmp → validate → rename ────────────────
  mkdirSync(join(ROOT, "src", "data"), { recursive: true });
  const tmpIndex = OUT_INDEX + ".tmp";
  const tmpReport = OUT_REPORT + ".tmp";
  writeFileSync(tmpIndex, JSON.stringify(index, null, 2) + "\n");
  writeFileSync(tmpReport, JSON.stringify(report, null, 2) + "\n");
  JSON.parse(readFileSync(tmpIndex, "utf8"));
  JSON.parse(readFileSync(tmpReport, "utf8"));
  renameSync(tmpIndex, OUT_INDEX);
  renameSync(tmpReport, OUT_REPORT);

  const topTech = technologies.slice(0, 8).map((t) => `${t.slug}:${t.count}`).join(" ");
  console.log(
    `[sync] OK — ${portfolios.length} portfolios | quarantined ${quarantined.length} | dups ${duplicateCollisions.length} | described ${withDescription} | classified ${classified}` +
      `\n[sync] source ${REPOSITORY}@${branch} commit ${commit ?? "unavailable"}`
  );
  console.log(`[sync] top categories: ${topTech}`);
  if (CHECK_MODE) console.log("[sync] --check mode: artifacts regenerated in working tree");
}

main().catch((err) => {
  console.error(`[sync] fatal: ${(err as Error).message}`);
  process.exit(1);
});
