import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  // Set required_complete to true for all seeded profiles for testing
  await sql`
    UPDATE profiles 
    SET required_complete = true 
    WHERE full_name IN ('Rahul Sharma', 'Amit Patel', 'Suresh Kumar', 'Arjun Raman', 'Karthik Suresh', 'Vikram Iyer', 'Siddharth Nair', 'Rohan Menon')
  `;
  
  // Get their IDs
  const profiles = await sql`
    SELECT id FROM profiles 
    WHERE full_name IN ('Rahul Sharma', 'Amit Patel', 'Suresh Kumar', 'Arjun Raman', 'Karthik Suresh', 'Vikram Iyer', 'Siddharth Nair', 'Rohan Menon')
  `;
  
  // Insert a dummy primary photo for each if they don't have one
  for (const p of profiles) {
    await sql`
      INSERT INTO profile_photos (profile_id, s3_key, is_primary)
      VALUES (${p.id}, 'dummy-photo.jpg', true)
      ON CONFLICT DO NOTHING
    `;
  }
  
  console.log("Updated required_complete and added dummy photos.");
  process.exit(0);
}
main();
