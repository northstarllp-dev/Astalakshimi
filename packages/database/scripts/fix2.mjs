import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(dbUrl);

async function run() {
  try {
    console.log('Adding hide_phone...');
    await sql.unsafe('ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "hide_phone" boolean DEFAULT false NOT NULL;');
    console.log('Adding photo_blur...');
    await sql.unsafe(`ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "photo_blur" varchar(20) DEFAULT 'always' NOT NULL;`);
    console.log('Adding hide_from_users...');
    await sql.unsafe(`ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "hide_from_users" jsonb DEFAULT '[]'::jsonb NOT NULL;`);
    console.log('Adding hide_from_cities...');
    await sql.unsafe(`ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "hide_from_cities" jsonb DEFAULT '[]'::jsonb NOT NULL;`);
    console.log('Done.');
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    await sql.end();
  }
}

run();
