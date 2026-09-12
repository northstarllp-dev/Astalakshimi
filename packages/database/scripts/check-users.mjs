import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

async function main() {
  try {
    const users = await sql`SELECT email, password_hash, role FROM users WHERE email IN ('admin@astalakshimi.in', 'staff@astalakshimi.in')`;
    console.log('Users found:', users);
  } catch (err) {
    console.error('Error querying:', err);
  } finally {
    await sql.end();
  }
}

main();
