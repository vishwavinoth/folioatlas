#!/usr/bin/env bash
# FolioAtlas — full project export packager.
# Builds export-staging/folioatlas-export-<stamp>/ with codebase, database dump,
# seeds, backups and env files, then zips it into download/.
set -euo pipefail

PROJECT=/home/z/my-project
STAMP=$(date +%Y-%m-%d)
TS=$(date +%Y%m%dT%H%M)
STAGE="$PROJECT/export-staging/folioatlas-export-$STAMP"
OUT="$PROJECT/download/folioatlas-export-$STAMP.zip"

cd "$PROJECT"

# 0. fresh stage
rm -rf "$STAGE"
mkdir -p "$STAGE"/{database,seeds,backups,env}

# 1. regenerate SQL dump + JSON exports from the live DB (source of truth)
bun scripts/dump-db.ts "$STAGE/database"

# 2. codebase copy (no build artifacts / deps / sandbox tooling / logs)
rsync -a \
  --exclude node_modules/ --exclude .next/ --exclude .git/ \
  --exclude dev.log --exclude seed.log --exclude server.log \
  --exclude '*.tsbuildinfo' \
  --exclude .zscripts/ --exclude skills/ \
  --exclude export-staging/ --exclude download/ \
  --exclude .z-ai-config --exclude .claude \
  "$PROJECT/" "$STAGE/folioatlas/"

# 2b. top-level guidance document
cp "$PROJECT/README-EXPORT.md" "$STAGE/"

# 3. raw database copy (restore-by-file path)
cp db/custom.db "$STAGE/database/folioatlas-sqlite.db"

# 4. seeds (input artifacts for scripts/seed-db.ts)
cp src/data/portfolios.generated.json "$STAGE/seeds/"
cp src/data/sync-report.generated.json "$STAGE/seeds/"

# 5. env files: as-is + portable variant + annotated example
cp .env "$STAGE/env/.env"
cp .env.example "$STAGE/env/.env.example"
cat > "$STAGE/env/.env.portable" <<'EOF'
# Portable variant — relative DB path (Prisma resolves it against prisma/schema.prisma,
# so ../db/custom.db = <project>/db/custom.db). Copy to folioatlas/.env.
DATABASE_URL="file:../db/custom.db"
EOF

# 6. backups: timestamped DB copy + data/config archive + full git history bundle
cp db/custom.db "$STAGE/backups/custom-$TS.db"
tar -czf "$STAGE/backups/data-artifacts-$TS.tar.gz" \
  -C "$PROJECT" src/data prisma/schema.prisma supabase .env.example
git bundle create "$STAGE/backups/folioatlas-git-$TS.bundle" --all 2>/dev/null

# 7. zip it
rm -f "$OUT"
(cd "$PROJECT/export-staging" && zip -rq "$OUT" "folioatlas-export-$STAMP")

echo "── package contents ──"
(cd "$STAGE" && du -sh . folioatlas database seeds backups env)
echo "── zip ──"
ls -la "$OUT"
echo "rows sanity: $(bun -e 'import {Database} from "bun:sqlite"; const d=new Database(process.argv[1],{readonly:true}); console.log(JSON.stringify({Portfolio:d.query("SELECT COUNT(*) c FROM Portfolio").get().c, Snapshots:d.query("SELECT COUNT(*) c FROM PortfolioCountSnapshot").get().c})); d.close()' "$STAGE/database/folioatlas-sqlite.db")"
