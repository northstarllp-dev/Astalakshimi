import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  const m = await sql`
    SELECT p.id, p.user_id, p.gender, p.dob, pp.pref_age_min, pp.pref_age_max, pp.pref_religions, pp.pref_marital_statuses
    FROM profiles p 
    LEFT JOIN partner_preferences pp ON p.id = pp.profile_id 
    WHERE p.full_name ILIKE '%mahalakshmi%'
  `;
  const viewerUserId = m[0].user_id;

  const religions = m[0].pref_religions.map(v => v.trim().toLowerCase());
  const maritalStatuses = m[0].pref_marital_statuses.map(v => v.trim().toLowerCase());
  
  const matches = await sql`
    SELECT p.id, p.full_name, p.dob, p.gender, p.required_complete,
      (SELECT COUNT(*) FROM profile_photos ph WHERE ph.profile_id = p.id AND ph.is_primary = true) as photo_count,
      (SELECT COUNT(*) FROM user_settings us WHERE us.user_id = p.user_id AND (us.hide_profile = true OR us.profile_visibility = 'hidden' OR us.profile_visibility = 'premium')) as hidden_count
    FROM profiles p
    WHERE p.user_id != ${viewerUserId}
      AND p.gender IN ('Male')
      AND p.required_complete = true
      AND lower(p.religion::text) = ANY(${religions})
      AND lower(p.marital_status::text) = ANY(${maritalStatuses})
      AND EXISTS (
        SELECT 1 FROM profile_photos ph
        WHERE ph.profile_id = p.id AND ph.is_primary = true
      )
  `;
  console.log("SQL Results:");
  matches.forEach(m => console.log(m));
  
  process.exit(0);
}
main();
