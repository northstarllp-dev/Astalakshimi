/**
 * Dump live Postgres schema and compare to Drizzle schema + API usage.
 * Usage (from repo root): node packages/database/scripts/audit-schema.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(root, '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const outDir = path.join(root, 'scratch', 'db-schema-audit');
fs.mkdirSync(outDir, { recursive: true });

const sql = postgres(dbUrl, { max: 1, prepare: false });

function parseDrizzleSchemas(schemaDir) {
  /** @type {Record<string, Set<string>>} */
  const tables = {};
  for (const file of fs.readdirSync(schemaDir).filter((f) => f.endsWith('.ts') && f !== 'index.ts')) {
    const text = fs.readFileSync(path.join(schemaDir, file), 'utf8');
    // Match pgTable('name', { ... }) and pgTable(\n  'name',
    const tableRe = /pgTable\(\s*(?:\n\s*)?['"](\w+)['"]/g;
    let m;
    const tableNames = [];
    while ((m = tableRe.exec(text))) tableNames.push(m[1]);

    // Columns only — skip index()/uniqueIndex() table extras
    const colRe =
      /^\s*\w+\s*:\s*(?!index\b|uniqueIndex\b|primaryKey\b|foreignKey\b|check\b|unique\b)(\w+)\(\s*['"](\w+)['"]/gm;

    function extractCols(chunk) {
      const cols = new Set();
      let cm;
      const re = new RegExp(colRe.source, 'gm');
      while ((cm = re.exec(chunk))) cols.add(cm[2]);
      return cols;
    }

    if (tableNames.length === 1) {
      tables[tableNames[0]] = extractCols(text);
    } else if (tableNames.length > 1) {
      const blocks = text.split(/pgTable\(/).slice(1);
      for (let i = 0; i < blocks.length; i++) {
        const nameMatch = blocks[i].match(/^\s*['"](\w+)['"]/);
        if (!nameMatch) continue;
        tables[nameMatch[1]] = extractCols(blocks[i]);
      }
    }
  }
  return tables;
}

function scanApiForSchemaUsage(apiSrc) {
  /** @type {Set<string>} */
  const importedSymbols = new Set();
  /** @type {string[]} */
  const rawSqlSnippets = [];
  /** @type {Map<string, string[]>} */
  const filesUsing = new Map();

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        walk(p);
      } else if (entry.name.endsWith('.ts')) {
        const text = fs.readFileSync(p, 'utf8');
        const fromDb = text.matchAll(
          /import\s*\{([^}]+)\}\s*from\s*['"]@astalakshimi\/database(?:\/schema)?['"]/g,
        );
        for (const im of fromDb) {
          for (const part of im[1].split(',')) {
            const sym = part.trim().split(/\s+as\s+/)[0].trim();
            if (sym) {
              importedSymbols.add(sym);
              if (!filesUsing.has(sym)) filesUsing.set(sym, []);
              filesUsing.get(sym).push(path.relative(root, p).replace(/\\/g, '/'));
            }
          }
        }
        // drizzle sql`...` or .execute(sql`...`)
        for (const sm of text.matchAll(/sql`([^`]{1,500})`/g)) {
          rawSqlSnippets.push({ file: path.relative(root, p).replace(/\\/g, '/'), sql: sm[1] });
        }
      }
    }
  }
  walk(apiSrc);
  return { importedSymbols: [...importedSymbols].sort(), filesUsing: Object.fromEntries(filesUsing), rawSqlSnippets };
}

try {
  console.log('Fetching live schema from RDS...');

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  const columns = await sql`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
           character_maximum_length, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  const constraints = await sql`
    SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
           kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
  `;

  const indexes = await sql`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;

  const drizzleMigrations = await sql`
    SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at
  `.catch(() => []);

  /** @type {Record<string, object[]>} */
  const liveByTable = {};
  for (const c of columns) {
    if (!liveByTable[c.table_name]) liveByTable[c.table_name] = [];
    liveByTable[c.table_name].push(c);
  }

  // Human-readable schema dump
  let ddl = `-- Astalakshimi live schema dump\n-- Generated: ${new Date().toISOString()}\n-- Source: RDS (schema-only, no data)\n\n`;
  for (const t of tables) {
    const name = t.table_name;
    ddl += `-- TABLE: ${name}\n`;
    ddl += `CREATE TABLE IF NOT EXISTS "${name}" (\n`;
    const cols = liveByTable[name] || [];
    ddl += cols
      .map((c, i) => {
        let type = c.udt_name;
        if (c.character_maximum_length) type = `${c.data_type}(${c.character_maximum_length})`;
        else if (c.data_type === 'numeric' && c.numeric_precision)
          type = `numeric(${c.numeric_precision},${c.numeric_scale || 0})`;
        else type = c.data_type;
        const nullability = c.is_nullable === 'YES' ? '' : ' NOT NULL';
        const def = c.column_default != null ? ` DEFAULT ${c.column_default}` : '';
        const comma = i < cols.length - 1 ? ',' : '';
        return `  "${c.column_name}" ${type}${nullability}${def}${comma}`;
      })
      .join('\n');
    ddl += `\n);\n\n`;
  }

  fs.writeFileSync(path.join(outDir, 'live-schema.sql'), ddl);
  fs.writeFileSync(
    path.join(outDir, 'live-schema.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        tables: tables.map((t) => t.table_name),
        columns: liveByTable,
        constraints,
        indexes,
        drizzleMigrations,
      },
      null,
      2,
    ),
  );

  // Compare to Drizzle
  const schemaDir = path.join(root, 'packages/database/src/schema');
  const codeTables = parseDrizzleSchemas(schemaDir);
  const liveTableNames = new Set(tables.map((t) => t.table_name));
  const codeTableNames = new Set(Object.keys(codeTables));

  const missingInDb = [...codeTableNames].filter((t) => !liveTableNames.has(t)).sort();
  const missingInCode = [...liveTableNames].filter((t) => !codeTableNames.has(t)).sort();

  /** @type {{table: string, column: string, side: string}[]} */
  const columnMismatches = [];
  for (const t of [...codeTableNames].sort()) {
    if (!liveTableNames.has(t)) continue;
    const liveCols = new Set((liveByTable[t] || []).map((c) => c.column_name));
    const codeCols = codeTables[t];
    for (const c of codeCols) {
      if (!liveCols.has(c)) columnMismatches.push({ table: t, column: c, side: 'missing_in_db' });
    }
    for (const c of liveCols) {
      if (!codeCols.has(c)) columnMismatches.push({ table: t, column: c, side: 'missing_in_code' });
    }
  }

  // API usage
  const apiScan = scanApiForSchemaUsage(path.join(root, 'apps/api/src'));

  // Map drizzle export names (camelCase) roughly to tables by reading schema exports
  // For report: list imported symbols that look unused vs used tables

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      liveTableCount: liveTableNames.size,
      codeTableCount: codeTableNames.size,
      tablesMissingInDb: missingInDb.length,
      tablesMissingInCode: missingInCode.length,
      columnsMissingInDb: columnMismatches.filter((m) => m.side === 'missing_in_db').length,
      columnsMissingInCode: columnMismatches.filter((m) => m.side === 'missing_in_code').length,
      apiSchemaImports: apiScan.importedSymbols.length,
      rawSqlCount: apiScan.rawSqlSnippets.length,
      appliedDrizzleMigrations: drizzleMigrations.length,
    },
    missingInDb,
    missingInCode,
    columnMismatches,
    liveTables: [...liveTableNames].sort(),
    codeTables: Object.fromEntries(
      Object.entries(codeTables).map(([k, v]) => [k, [...v].sort()]),
    ),
    api: apiScan,
  };

  fs.writeFileSync(path.join(outDir, 'schema-diff-report.json'), JSON.stringify(report, null, 2));

  let md = `# Schema audit report\n\nGenerated: ${report.generatedAt}\n\n`;
  md += `## Summary\n\n`;
  md += `- Live tables: **${report.summary.liveTableCount}**\n`;
  md += `- Code (Drizzle) tables: **${report.summary.codeTableCount}**\n`;
  md += `- Tables in code but missing in DB: **${report.summary.tablesMissingInDb}**\n`;
  md += `- Tables in DB but missing in code: **${report.summary.tablesMissingInCode}**\n`;
  md += `- Columns in code but missing in DB: **${report.summary.columnsMissingInDb}**\n`;
  md += `- Columns in DB but missing in code: **${report.summary.columnsMissingInCode}**\n`;
  md += `- Drizzle migrations recorded: **${report.summary.appliedDrizzleMigrations}**\n\n`;

  if (missingInDb.length) {
    md += `## Tables missing in DB\n\n${missingInDb.map((t) => `- \`${t}\``).join('\n')}\n\n`;
  }
  if (missingInCode.length) {
    md += `## Tables in DB not in Drizzle schema\n\n${missingInCode.map((t) => `- \`${t}\``).join('\n')}\n\n`;
  }

  const missDbCols = columnMismatches.filter((m) => m.side === 'missing_in_db');
  const missCodeCols = columnMismatches.filter((m) => m.side === 'missing_in_code');
  if (missDbCols.length) {
    md += `## Columns missing in DB (will break API inserts/selects)\n\n`;
    md += `| Table | Column |\n|-------|--------|\n`;
    for (const m of missDbCols) md += `| ${m.table} | ${m.column} |\n`;
    md += `\n`;
  }
  if (missCodeCols.length) {
    md += `## Columns in DB not declared in Drizzle (usually OK / leftover)\n\n`;
    md += `| Table | Column |\n|-------|--------|\n`;
    for (const m of missCodeCols) md += `| ${m.table} | ${m.column} |\n`;
    md += `\n`;
  }

  md += `## API schema imports\n\n`;
  md += apiScan.importedSymbols.map((s) => `- \`${s}\``).join('\n') + '\n\n';

  if (apiScan.rawSqlSnippets.length) {
    md += `## Raw sql\`\` snippets in API (${apiScan.rawSqlSnippets.length})\n\n`;
    for (const s of apiScan.rawSqlSnippets.slice(0, 50)) {
      md += `- \`${s.file}\`: \`${s.sql.replace(/\s+/g, ' ').slice(0, 120)}\`\n`;
    }
    md += `\n`;
  }

  md += `## Artifacts\n\n`;
  md += `- \`scratch/db-schema-audit/live-schema.sql\`\n`;
  md += `- \`scratch/db-schema-audit/live-schema.json\`\n`;
  md += `- \`scratch/db-schema-audit/schema-diff-report.json\`\n`;

  fs.writeFileSync(path.join(outDir, 'REPORT.md'), md);

  console.log(JSON.stringify(report.summary, null, 2));
  if (missDbCols.length) {
    console.log('\nCRITICAL - columns missing in DB:');
    for (const m of missDbCols) console.log(`  ${m.table}.${m.column}`);
  }
  if (missingInDb.length) {
    console.log('\nCRITICAL - tables missing in DB:');
    for (const t of missingInDb) console.log(`  ${t}`);
  }
  console.log(`\nWrote dumps to ${outDir}`);
} finally {
  await sql.end();
}
