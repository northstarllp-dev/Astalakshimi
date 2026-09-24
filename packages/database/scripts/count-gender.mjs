import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  const query = await sql`
    SELECT gender, COUNT(*) as count
    FROM profiles
    GROUP BY gender
  `;
  console.log("Gender split:", query);
  process.exit(0);
}
main();
