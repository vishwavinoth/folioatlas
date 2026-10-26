/**
 * FolioAtlas — provenance-grade Supabase sync (PRD §8, §2 data-integrity rule).
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
 * Entries no longer in the artifact are removed (their summaries cascade).
 *
 * Requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY.
 * Idempotent: safe to re-run after every artifact change.
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
import { tmpdir } from "node:os";
import { requireDbWriter, fetchAllRows } from "../src/lib/supabase/server";
import type { Database } from "../src/lib/supabase/types";

const ROOT = join(import.meta.dir, "..");
const ARTIFACT = join(ROOT, "src", "data", "portfolios.generated.json");
const REPO_URL = `https://github.com/${process.env.GITHUB_OWNER || "emmabostian"}/${process.env.GITHUB_REPO || "developer-portfolios"}`;
const README_PATH = process.env.GITHUB_README_PATH || "README.md";
const REPOSITORY = `${process.env.GITHUB_OWNER || "emmabostian"}/${process.env.GITHUB_REPO || "developer-portfolios"}`;

const cloneArgIdx = process.argv.indexOf("--clone-dir");
const CLONE_DIR = cloneArgIdx !== -1 ? process.argv[cloneArgIdx + 1] : join(tmpdir(), "fa-upstream");

const db = requireDbWriter();
const CHUNK = 500;

type PortfolioInsert = Database["public"]["Tables"]["portfolios"]["Insert"];
type SnapshotInsert = Database["public"]["Tables"]["portfolio_count_snapshots"]["Insert"];

/** Throw on a Supabase error so a partial sync never reports success. */
function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

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
  const unmatched: string[] = [];
  for (const p of artifact.portfolios) {
    if (!firstSeen.has(p.id)) unmatched.push(p.id);
  }
  if (unmatched.length > 0) {
    console.warn(`[seed] ${unmatched.length} artifact entries lack git-history provenance (will use sync fallback)`);
  }

  // ── Persist ─────────────────────────────────────────────────────────────
  const run = check(
    await db
      .from("sync_runs")
      .insert({
        started_at: new Date().toISOString(),
        status: "running",
        trigger: process.env.GITHUB_ACTIONS ? "github-action" : "seed",
        source_commit_sha: artifact.source.commit,
      })
      .select("id")
      .single(),
    "create sync run"
  )!;

  try {
    const existingIds = new Set(
      (
        await fetchAllRows<{ id: string }>((from, to) => db.from("portfolios").select("id").order("id").range(from, to))
      ).map((r) => r.id)
    );

    const rows: PortfolioInsert[] = artifact.portfolios.map((p) => {
      const history = firstSeen.get(p.id);
      const firstAt = history?.at ?? new Date(artifact.generatedAt);
      const lastAt = lastPresent.get(p.id)?.at ?? new Date(artifact.generatedAt);
      const contentChangedAt = lastChanged.get(p.id);
      const sourceUpdatedAt =
        contentChangedAt && contentChangedAt.at.getTime() > firstAt.getTime() ? contentChangedAt.at : null;
      const { username, source: ghSource } = deriveGithubUsername(p.url);
      return {
        id: p.id,
        slug: p.id,
        name: p.name,
        github_username: username,
        github_profile_url: username ? githubProfileUrl(username) : null,
        github_source: ghSource,
        portfolio_url: p.url,
        avatar_url: username ? githubAvatarUrl(username) : null,
        role: p.description ?? null, // verbatim upstream bracket text
        description: null,
        technologies: p.technologies ?? [],
        letter: p.letter,
        source_section: p.letter,
        source_repository: REPOSITORY,
        source_line: p.source.line ?? null,
        source_entry_hash: sha1Hex(`${p.name}|${p.url}|${p.description ?? ""}`),
        first_seen_at: firstAt.toISOString(),
        last_seen_at: lastAt.toISOString(),
        source_updated_at: sourceUpdatedAt?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      };
    });

    for (let i = 0; i < rows.length; i += CHUNK) {
      check(await db.from("portfolios").upsert(rows.slice(i, i + CHUNK), { onConflict: "id" }), "upsert portfolios");
    }
    const inserted = rows.filter((r) => !existingIds.has(r.id)).length;
    const updated = rows.length - inserted;

    // Entries removed upstream leave the directory (AI summaries cascade).
    const keep = new Set(rows.map((r) => r.id));
    const removed = [...existingIds].filter((id) => !keep.has(id));
    for (let i = 0; i < removed.length; i += 200) {
      check(await db.from("portfolios").delete().in("id", removed.slice(i, i + 200)), "delete removed portfolios");
    }
    console.log(`[seed] portfolios — ${inserted} inserted, ${updated} updated, ${removed.length} removed`);

    // Git-history snapshots: idempotent replace.
    check(await db.from("portfolio_count_snapshots").delete().eq("provenance", "git-history"), "clear git-history snapshots");
    const snapshotRows: SnapshotInsert[] = snapshots.map((s) => ({
      sync_run_id: run.id,
      recorded_at: s.recordedAt.toISOString(),
      total_portfolios: s.totalPortfolios,
      portfolios_added: s.portfoliosAdded,
      provenance: "git-history",
      source_commit_sha: s.sourceCommitSha,
    }));
    for (let i = 0; i < snapshotRows.length; i += CHUNK) {
      check(await db.from("portfolio_count_snapshots").insert(snapshotRows.slice(i, i + CHUNK)), "insert snapshots");
    }

    // Sync-run snapshot for THIS execution (provenance "sync-run").
    const finalCount = artifact.portfolios.length;
    const lastGitTotal = snapshots.length > 0 ? snapshots[snapshots.length - 1].totalPortfolios : 0;
    check(
      await db.from("portfolio_count_snapshots").insert({
        sync_run_id: run.id,
        recorded_at: new Date().toISOString(),
        total_portfolios: finalCount,
        portfolios_added: Math.max(0, finalCount - lastGitTotal),
        portfolios_updated: 0,
        provenance: "sync-run",
        source_commit_sha: artifact.source.commit,
      }),
      "insert sync-run snapshot"
    );

    check(
      await db
        .from("sync_runs")
        .update({
          completed_at: new Date().toISOString(),
          status: "success",
          source_entry_count: finalCount,
          inserted_count: inserted,
          updated_count: updated,
          removed_or_missing_count: removed.length,
          error_summary:
            unmatched.length > 0 ? `${unmatched.length} entries without git provenance (fallback applied)` : null,
        })
        .eq("id", run.id),
      "complete sync run"
    );
  } catch (err) {
    await db
      .from("sync_runs")
      .update({ completed_at: new Date().toISOString(), status: "failed", error_summary: String(err).slice(0, 500) })
      .eq("id", run.id);
    throw err;
  }

  const { count } = await db.from("portfolios").select("id", { count: "exact", head: true });
  console.log(`[seed] DONE — portfolios: ${count}, git-history snapshots: ${snapshots.length}, run: ${run.id}`);
  console.log(
    `[seed] verified history range: ${snapshots[0]?.recordedAt.toISOString()} → ${snapshots[snapshots.length - 1]?.recordedAt.toISOString()}`
  );
}

main().catch((err) => {
  console.error("[seed] FAILED:", err);
  process.exit(1);
});
