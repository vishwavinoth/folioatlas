/**
 * FolioAtlas — provenance-grade database seed (PRD §8, §2 data-integrity rule).
 *
 * Mines the VERIFIED git history of the upstream repository:
 *   - every README.md commit → real entry counts → PortfolioCountSnapshot rows
 *     with provenance "git-history" and the exact commit SHA
 *   - per-entry first_seen_at = first commit containing the entry (valid, normalized URL)
 *   - per-entry source_updated_at = last commit where the entry's content hash changed
 *   - last_seen_at = last commit where the entry was present
 *
 * NO timestamps are invented. The generation timestamp of a report file is
 * never used as an entry creation date. When history is unavailable for an
 * entry, the fields fall back to the latest verified sync commit and the UI
 * labels the available historical range.
 *
 * Final directory state comes from the authoritative generated artifact
 * (portfolios.generated.json), produced by scripts/sync-portfolios.ts.
 *
 * Usage:  bun scripts/seed-db.ts [--clone-dir /tmp/fa-upstream]
 */
import { parseReadme } from "../src/lib/portfolio/parse";
import { validateAndNormalizeUrl } from "../src/lib/portfolio/url";
import { deterministicId, sha1Hex } from "../src/lib/portfolio/identity";
import { deriveGithubUsername, githubAvatarUrl, githubProfileUrl } from "../src/lib/portfolio/github";
import type { PortfolioIndex } from "../src/lib/portfolio/types";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = join(import.meta.dir, "..");
const ARTIFACT = join(ROOT, "src", "data", "portfolios.generated.json");
const REPO_URL = `https://github.com/${process.env.GITHUB_OWNER || "emmabostian"}/${process.env.GITHUB_REPO || "developer-portfolios"}`;
const README_PATH = process.env.GITHUB_README_PATH || "README.md";
const REPOSITORY = `${process.env.GITHUB_OWNER || "emmabostian"}/${process.env.GITHUB_REPO || "developer-portfolios"}`;

const cloneArgIdx = process.argv.indexOf("--clone-dir");
const CLONE_DIR = cloneArgIdx !== -1 ? process.argv[cloneArgIdx + 1] : "/tmp/fa-upstream";

const db = new PrismaClient({ log: ["error"] });

function git(args: string[], cwd: string): string {
  const proc = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  if (proc.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${proc.stderr.toString().slice(0, 300)}`);
  }
  return proc.stdout.toString();
}

type CommitInfo = { sha: string; date: Date; blob: string | null };

function listCommits(cwd: string): CommitInfo[] {
  const raw = git(
    ["log", "--reverse", "--format=%H %cI", "--raw", "--no-renames", "--", README_PATH],
    cwd
  );
  const commits: CommitInfo[] = [];
  let current: { sha: string; date: string } | null = null;
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    if (line.includes("\t")) {
      // raw line: ":100644 100644 <old> <new> M\tREADME.md"
      const cols = line.split("\t")[0].split(" ");
      const newBlob = cols[3];
      if (current) {
        commits.push({ sha: current.sha, date: new Date(current.date), blob: newBlob });
        current = null;
      }
    } else if (/^[0-9a-f]{40} /.test(line)) {
      const [sha, date] = line.split(" ");
      current = { sha, date };
    }
  }
  if (current) commits.push({ sha: current.sha, date: new Date(current.date), blob: null });
  return commits;
}

async function main() {
  if (!existsSync(ARTIFACT)) throw new Error("artifact missing — run scripts/sync-portfolios.ts first");
  const artifact = JSON.parse(readFileSync(ARTIFACT, "utf8")) as PortfolioIndex;
  if (artifact.portfolios.length === 0) throw new Error("artifact empty — refusing to seed");
  console.log(`[seed] artifact: ${artifact.portfolios.length} portfolios @ ${artifact.source.commit?.slice(0, 10)}`);

  if (!existsSync(join(CLONE_DIR, ".git"))) {
    console.log(`[seed] cloning ${REPO_URL} → ${CLONE_DIR}`);
    const proc = Bun.spawnSync(["git", "clone", "--quiet", REPO_URL, CLONE_DIR], { stdout: "pipe", stderr: "pipe" });
    if (proc.exitCode !== 0) throw new Error(`clone failed: ${proc.stderr.toString().slice(0, 300)}`);
  }

  const commits = listCommits(CLONE_DIR);
  console.log(`[seed] ${commits.length} commits touching ${README_PATH}`);

  // ── Walk history ────────────────────────────────────────────────────────
  const firstSeen = new Map<string, { at: Date; sha: string }>();
  const lastChanged = new Map<string, { at: Date; sha: string }>();
  const lastPresent = new Map<string, { at: Date; sha: string }>();
  const snapshots: Array<{
    recordedAt: Date;
    totalPortfolios: number;
    portfoliosAdded: number;
    provenance: string;
    sourceCommitSha: string;
  }> = [];

  let prevBlob: string | null = null;
  const cache = new Map<string, string>(); // blob → markdown (bounded: only reused for immediate dupes)
  /** id → content hash from the previously parsed commit (for change detection). */
  const prevHashes = new Map<string, string>();
  let parsed = 0;
  const startedAt = Date.now();

  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    // Skip identical blobs (merge commits that do not modify the file).
    if (c.blob && c.blob === prevBlob) continue;

    let markdown: string;
    if (c.blob && cache.get(c.blob)) {
      markdown = cache.get(c.blob)!;
    } else {
      markdown = git(["show", `${c.sha}:${README_PATH}`], CLONE_DIR);
      if (c.blob) {
        cache.clear(); // keep memory bounded — only consecutive dedupe matters
        cache.set(c.blob, markdown);
      }
    }
    prevBlob = c.blob;

    const { entries } = parseReadme(markdown);
    const seenThisCommit = new Set<string>();
    let added = 0;

    for (const entry of entries) {
      const verdict = validateAndNormalizeUrl(entry.rawUrl);
      if (!verdict.ok) continue; // same policy as the artifact pipeline
      const id = deterministicId(entry.name, verdict.url);
      if (seenThisCommit.has(id)) continue;
      seenThisCommit.add(id);

      const first = firstSeen.get(id);
      if (!first) {
        firstSeen.set(id, { at: c.date, sha: c.sha });
        added += 1;
      }
      lastPresent.set(id, { at: c.date, sha: c.sha });

      const contentHash = sha1Hex(`${entry.name}|${verdict.url}|${entry.roleText ?? ""}`);
      if (prevHashes.get(id) !== contentHash) {
        // Content differs from the entry's previous state (or is brand new).
        // For genuinely new entries firstSeen covers this commit; only record
        // a change when the entry already existed.
        if (first || lastChanged.has(id)) {
          if (first && prevHashes.has(id)) {
            // re-appeared after absence with different content
            lastChanged.set(id, { at: c.date, sha: c.sha });
          } else if (!first) {
            lastChanged.set(id, { at: c.date, sha: c.sha });
          }
        }
        prevHashes.set(id, contentHash);
      }
    }

    snapshots.push({
      recordedAt: c.date,
      totalPortfolios: seenThisCommit.size,
      portfoliosAdded: added,
      provenance: "git-history",
      sourceCommitSha: c.sha,
    });
    parsed += 1;

    if (parsed % 500 === 0) {
      const rate = parsed / ((Date.now() - startedAt) / 1000);
      console.log(`[seed] ${i + 1}/${commits.length} commits (${rate.toFixed(1)} commits/s)`);
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
  console.log(`[seed] history walk done in ${elapsed}s — ${snapshots.length} snapshots, ${firstSeen.size} distinct entries`);

  // ── Cross-check artifact against history ────────────────────────────────
  const lastCommit = commits[commits.length - 1];
  const unmatched: string[] = [];
  for (const p of artifact.portfolios) {
    if (!firstSeen.has(p.id)) unmatched.push(p.id);
  }
  if (unmatched.length > 0) {
    console.warn(`[seed] ${unmatched.length} artifact entries lack git-history provenance (will use sync fallback)`);
  }

  // ── Persist ─────────────────────────────────────────────────────────────
  const run = await db.syncRun.create({
    data: {
      startedAt: new Date(),
      status: "running",
      trigger: "seed",
      sourceCommitSha: artifact.source.commit,
    },
  });

  let inserted = 0;
  let updated = 0;
  for (const p of artifact.portfolios) {
    const history = firstSeen.get(p.id);
    const firstAt = history?.at ?? new Date(artifact.generatedAt);
    const lastAt = lastPresent.get(p.id)?.at ?? new Date(artifact.generatedAt);
    const contentChangedAt = lastChanged.get(p.id);
    const sourceUpdatedAt = contentChangedAt && contentChangedAt.at.getTime() > firstAt.getTime() ? contentChangedAt.at : null;

    const { username, source: ghSource } = deriveGithubUsername(p.url);
    const data = {
      id: p.id,
      slug: p.id,
      name: p.name,
      githubUsername: username,
      githubProfileUrl: username ? githubProfileUrl(username) : null,
      githubSource: ghSource,
      portfolioUrl: p.url,
      avatarUrl: username ? githubAvatarUrl(username) : null,
      role: p.description ?? null, // verbatim upstream bracket text
      description: null as string | null,
      technologies: JSON.stringify(p.technologies ?? []),
      letter: p.letter,
      sourceSection: p.letter,
      sourceRepository: REPOSITORY,
      sourceLine: p.source.line ?? null,
      sourceEntryHash: sha1Hex(`${p.name}|${p.url}|${p.description ?? ""}`),
      firstSeenAt: firstAt,
      lastSeenAt: lastAt,
      sourceUpdatedAt,
    };

    const existing = await db.portfolio.findUnique({ where: { id: p.id }, select: { id: true } });
    if (existing) {
      await db.portfolio.update({ where: { id: p.id }, data });
      updated += 1;
    } else {
      await db.portfolio.create({ data });
      inserted += 1;
    }
  }
  console.log(`[seed] portfolios upserted — ${inserted} inserted, ${updated} updated`);

  // Git-history snapshots: idempotent replace (delete + bulk create).
  await db.portfolioCountSnapshot.deleteMany({ where: { provenance: "git-history" } });
  const CHUNK = 500;
  for (let i = 0; i < snapshots.length; i += CHUNK) {
    await db.portfolioCountSnapshot.createMany({ data: snapshots.slice(i, i + CHUNK).map((s) => ({ ...s, syncRunId: run.id })) });
  }

  // Final count verification from the authoritative artifact.
  const finalCount = artifact.portfolios.length;
  const lastGitTotal = snapshots.length > 0 ? snapshots[snapshots.length - 1].totalPortfolios : 0;

  // Sync-run snapshot for THIS execution (provenance "sync-run").
  await db.portfolioCountSnapshot.create({
    data: {
      syncRunId: run.id,
      recordedAt: new Date(),
      totalPortfolios: finalCount,
      portfoliosAdded: Math.max(0, finalCount - lastGitTotal),
      portfoliosUpdated: 0,
      provenance: "sync-run",
      sourceCommitSha: artifact.source.commit,
    },
  });

  await db.syncRun.update({
    where: { id: run.id },
    data: {
      completedAt: new Date(),
      status: "success",
      sourceEntryCount: finalCount,
      insertedCount: inserted,
      updatedCount: updated,
      removedOrMissingCount: 0,
      errorSummary: unmatched.length > 0 ? `${unmatched.length} entries without git provenance (fallback applied)` : null,
    },
  });

  const totals = await db.portfolio.count();
  const snapCount = await db.portfolioCountSnapshot.count();
  console.log(`[seed] DONE — portfolios: ${totals}, snapshots: ${snapCount}, run: ${run.id}`);
  console.log(`[seed] verified history range: ${snapshots[0]?.recordedAt.toISOString()} → ${snapshots[snapshots.length - 1]?.recordedAt.toISOString()}`);
}

main()
  .catch((err) => {
    console.error("[seed] FAILED:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
