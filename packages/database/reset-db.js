import postgres from 'postgres';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'require' });

async function run() {
  console.log('Truncating tables...');
  await sql`TRUNCATE users CASCADE;`;
  console.log('Truncated.');
  process.exit(0);
}
run().catch(console.error);
