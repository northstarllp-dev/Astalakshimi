import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  const newProfiles = await sql`
    SELECT p.id, p.full_name, p.required_complete,
      (SELECT COUNT(*) FROM profile_photos ph WHERE ph.profile_id = p.id) as photo_count
    FROM profiles p 
    WHERE p.full_name IN ('Rahul Sharma', 'Amit Patel', 'Suresh Kumar')
  `;
  console.log("New profiles:", newProfiles);
  process.exit(0);
}
main();
