import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  const m = await sql`
    SELECT pp.*
    FROM profiles p 
    LEFT JOIN partner_preferences pp ON p.id = pp.profile_id 
    WHERE p.full_name ILIKE '%mahalakshmi%'
  `;
  console.dir(m[0], { depth: null });
  process.exit(0);
}
main();
