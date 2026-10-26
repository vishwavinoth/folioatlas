// FolioAtlas — read-only database inspection (uses bun:sqlite, no writes).
import { Database } from "bun:sqlite";
import { statSync } from "fs";
import { resolve } from "path";

const dbPath = process.env.DB_PATH || resolve(import.meta.dir, "..", "db", "custom.db");
const db = new Database(dbPath, { readonly: true });

const tables = db
  .query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations' ORDER BY name"
  )
  .all() as { name: string }[];

const report: Record<string, unknown> = {};

for (const { name } of tables) {
  const count = db.query(`SELECT COUNT(*) as c FROM "${name}"`).get() as { c: number };
  report[name] = { rows: count.c };
}

// Portfolio specifics (Prisma uses PascalCase table names in SQLite)
report["_portfolio_detail"] = {
  by_letter: db
    .query(`SELECT letter, COUNT(*) as c FROM Portfolio GROUP BY letter ORDER BY letter`)
    .all(),
  with_github_identity: (db.query(`SELECT COUNT(*) as c FROM Portfolio WHERE githubUsername IS NOT NULL`).get() as { c: number }).c,
  with_role: (db.query(`SELECT COUNT(*) as c FROM Portfolio WHERE role IS NOT NULL AND role != ''`).get() as { c: number }).c,
};

report["_snapshots_detail"] = {
  by_provenance: db
    .query(`SELECT provenance, COUNT(*) as c FROM PortfolioCountSnapshot GROUP BY provenance`)
    .all(),
  range: db
    .query(`SELECT MIN(recordedAt) as min, MAX(recordedAt) as max FROM PortfolioCountSnapshot`)
    .get(),
  max_total: (db.query(`SELECT MAX(totalPortfolios) as m FROM PortfolioCountSnapshot`).get() as { m: number }).m,
};

report["_summaries_detail"] = {
  by_status: db.query(`SELECT status, COUNT(*) as c FROM PortfolioAiSummary GROUP BY status`).all(),
};

report["_sync_runs_detail"] = db
  .query(`SELECT status, trigger, COUNT(*) as c FROM SyncRun GROUP BY status, trigger`)
  .all();

report["_file"] = { path: dbPath, bytes: statSync(dbPath).size };

console.log(JSON.stringify(report, null, 2));
db.close();
