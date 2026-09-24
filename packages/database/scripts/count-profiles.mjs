import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  const total = await sql`SELECT count(*) FROM profiles`;
  console.log("Total profiles:", total[0].count);
  
  const query = await sql`
    SELECT required_complete, 
           (SELECT COUNT(*) FROM profile_photos ph WHERE ph.profile_id = p.id AND ph.is_primary = true) > 0 as has_primary_photo,
           COUNT(*) as count
    FROM profiles p
    GROUP BY required_complete, has_primary_photo
  `;
  console.log("Breakdown:", query);

  process.exit(0);
}
main();
