import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  await sql`
    UPDATE users 
    SET role = 'admin' 
    WHERE id = (
      SELECT user_id FROM profiles WHERE full_name ILIKE '%mahalakshmi%' LIMIT 1
    )
  `;
  
  console.log("Granted admin role to Mahalakshmi");
  process.exit(0);
}
main();
