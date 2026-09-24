import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  // 1. Get Mahalakshmi's User ID & Profile ID
  const m = await sql`
    SELECT p.id, p.user_id, p.gender, pp.pref_age_min, pp.pref_age_max, pp.pref_religions, pp.pref_marital_statuses
    FROM profiles p 
    LEFT JOIN partner_preferences pp ON p.id = pp.profile_id 
    WHERE p.full_name ILIKE '%mahalakshmi%'
  `;
  const viewer = m[0];
  console.log("Mahalakshmi:", viewer);

  // 2. Check the candidates manually
  const candidates = await sql`
    SELECT p.id, p.full_name, p.gender, p.dob, p.required_complete, p.religion, p.marital_status,
           (SELECT COUNT(*) FROM profile_photos ph WHERE ph.profile_id = p.id AND ph.is_primary = true) as primary_photo_count,
           p.photo_privacy
    FROM profiles p
    WHERE p.full_name IN ('Rahul Sharma', 'Amit Patel', 'Suresh Kumar', 'Arjun Raman')
  `;
  
  console.log("Candidates:", candidates);
  
  process.exit(0);
}
main();
