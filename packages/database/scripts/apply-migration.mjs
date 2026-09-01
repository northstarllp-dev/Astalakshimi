import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const migrationFile = process.argv[2] || '0006_education_master.sql';
const migrationPath = path.resolve(__dirname, '../migrations', migrationFile);
const raw = fs.readFileSync(migrationPath, 'utf8');
const statements = raw
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean);

const sql = postgres(dbUrl);

try {
  for (const statement of statements) {
    await sql.unsafe(statement);
  }
  console.log(`Applied ${migrationFile} to database.`);
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
} finally {
  await sql.end();
}
