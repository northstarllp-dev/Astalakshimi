import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString, { ssl: 'require' });

async function main() {
  const profiles = await sql`SELECT id FROM profiles`;
  for (const p of profiles) {
    const photos = await sql`SELECT id FROM profile_photos WHERE profile_id = ${p.id}::uuid LIMIT 1`;
    if (photos.length === 0) {
      await sql`
        INSERT INTO profile_photos (id, profile_id, s3_key, is_primary, status)
        VALUES (${randomUUID()}::uuid, ${p.id}::uuid, 'dummy_photo.jpg', true, 'approved')
      `;
    }
    await sql`UPDATE profiles SET required_complete = true WHERE id = ${p.id}::uuid`;
  }
  console.log("Added photos and required_complete=true to profiles.");
  await sql.end();
}
main().catch(console.error);
