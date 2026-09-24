import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  const m = await sql`
    SELECT p.id, p.user_id
    FROM profiles p 
    WHERE p.full_name ILIKE '%mahalakshmi%'
  `;
  const viewerProfileId = m[0].id;
  const viewerUserId = m[0].user_id;

  const skipped = await sql`
    SELECT count(*)
    FROM skipped_profiles
    WHERE user_id = ${viewerUserId}
  `;
  console.log("Skipped Count:", skipped);
  
  const interests = await sql`
    SELECT count(*)
    FROM interests
    WHERE sender_profile_id = ${viewerProfileId}
  `;
  console.log("Interests Sent Count:", interests);

  process.exit(0);
}
main();
