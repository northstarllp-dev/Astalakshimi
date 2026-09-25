import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl: 'require',
});

async function main() {
  const profiles = await sql`
    SELECT id, full_name, height_cm FROM profiles
  `;
  
  console.log(`Found ${profiles.length} profiles. Randomizing heights...`);
  
  for (const profile of profiles) {
    // Generate random height between 150 and 190
    // But since the user wants some "short, some average", let's use a nice distribution
    const heights = [150, 155, 160, 162, 165, 170, 172, 175, 178, 180, 182, 185];
    const randomHeight = heights[Math.floor(Math.random() * heights.length)];
    
    await sql`
      UPDATE profiles 
      SET height_cm = ${randomHeight}
      WHERE id = ${profile.id}
    `;
  }
  
  console.log("Randomized heights successfully.");
  await sql.end();
}

main().catch(console.error);
