// FolioAtlas — database dump + JSON export generator.
//
// Produces a portable SQL dump and per-table JSON exports of the SQLite
// database (read-only; the live DB is never modified).
//
// Usage:
//   bun scripts/dump-db.ts [output-dir]
//     [output-dir]  defaults to /home/z/my-project/export-staging/database
//
// Outputs:
//   <dir>/folioatlas-sqlite.sql        full dump (schema + data, transactional)
//   <dir>/json-exports/<Table>.json    one JSON array per table
//   <dir>/json-exports/manifest.json   row counts + metadata
import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync, statSync } from "fs";
import { join, resolve } from "path";

const dbPath = process.env.DB_PATH || resolve(import.meta.dir, "..", "db", "custom.db");
const outDir = resolve(process.argv[2] || resolve(import.meta.dir, "..", "..", "database"));
const jsonDir = join(outDir, "json-exports");
mkdirSync(jsonDir, { recursive: true });

// FK-safe insert order (children after parents); anything else appended alphabetically.
const ORDER = ["Portfolio", "SyncRun", "PortfolioAiSummary", "PortfolioPreview", "PortfolioCountSnapshot"];

const db = new Database(dbPath, { readonly: true });

const tables = (
  db
    .query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all() as { name: string }[]
).map((t) => t.name);

const ordered = [
  ...ORDER.filter((t) => tables.includes(t)),
  ...tables.filter((t) => !ORDER.includes(t)),
];

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value instanceof Uint8Array) {
    return `X'${Buffer.from(value).toString("hex")}'`;
  }
  const s = String(value);
  return `'${s.replace(/'/g, "''")}'`;
}

const parts: string[] = [];
parts.push(`-- FolioAtlas SQLite dump`);
parts.push(`-- Generated: ${new Date().toISOString()}`);
parts.push(`-- Source: ${dbPath} (${statSync(dbPath).size} bytes)`);
parts.push(`-- Restore: sqlite3 folioatlas.db < folioatlas-sqlite.sql  (or: bun -e with bun:sqlite)`);
parts.push(`PRAGMA foreign_keys=OFF;`);
parts.push(`BEGIN TRANSACTION;`);
parts.push("");

const manifest: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  sourceDatabase: dbPath,
  sourceBytes: statSync(dbPath).size,
  tables: {} as Record<string, number>,
};

for (const table of ordered) {
  const ddl = (
    db
      .query(`SELECT sql FROM sqlite_master WHERE type='table' AND name=? AND sql IS NOT NULL`)
      .get(table) as { sql: string } | null
  )?.sql;
  if (ddl) parts.push(ddl + ";");

  const cols = (db.query(`PRAGMA table_info("${table}")`).all() as { name: string }[]).map(
    (c) => c.name
  );
  const rows = db.query(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];

  for (const row of rows) {
    const values = cols.map((c) => sqlLiteral(row[c])).join(", ");
    parts.push(
      `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${values});`
    );
  }
  parts.push("");
  (manifest.tables as Record<string, number>)[table] = rows.length;
  writeFileSync(join(jsonDir, `${table}.json`), JSON.stringify(rows, null, 1));
}

for (const idx of db
  .query(`SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL`)
  .all() as { sql: string }[]) {
  parts.push(idx.sql + ";");
}

parts.push(`COMMIT;`);
parts.push("");

const sqlDump = parts.join("\n");
writeFileSync(join(outDir, "folioatlas-sqlite.sql"), sqlDump);
writeFileSync(join(jsonDir, "manifest.json"), JSON.stringify(manifest, null, 2));

db.close();
console.log(`Dumped ${ordered.length} tables → ${outDir}`);
console.log(`  SQL:  ${join(outDir, "folioatlas-sqlite.sql")} (${sqlDump.length} chars)`);
console.log(`  JSON: ${jsonDir}`);
console.log(`  Rows:`, JSON.stringify(manifest.tables));
