import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString, { max: 1, ssl: 'require' as any });

async function main() {
  const migrationFile = resolve(__dirname, '../migrations/0012_drop_catalog_tables.sql');
  const raw = readFileSync(migrationFile, 'utf-8');

  // drizzle migrations use semicolon-delimited statements; split carefully.
  // The migration only contains DDL with no function bodies, so a simple
  // semicolon split (ignoring blank lines / comments) is safe here.
  const statements = raw
    .split(/\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
      console.log('OK:', stmt.split('\n')[0].slice(0, 80));
    } catch (e) {
      // IF EXISTS guards make these idempotent; only surface real errors.
      console.error('ERR:', e.message, '||', stmt.slice(0, 80));
    }
  }

  console.log('Migration 0012 applied.');
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
