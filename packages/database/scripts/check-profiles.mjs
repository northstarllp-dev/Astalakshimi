import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbUrl = process.env.DATABASE_URL;
const sql = postgres(dbUrl);

async function run() {
  try {
    const females = await sql`SELECT count(*) FROM profiles WHERE gender = 'Female'`;
    const madan = await sql`SELECT id, full_name, gender, user_id FROM profiles WHERE full_name ILIKE '%madan%'`;
    console.log('Females count:', females);
    console.log('Madan:', madan);
    
    if (madan.length > 0) {
      const prefs = await sql`SELECT * FROM partner_preferences WHERE profile_id = ${madan[0].id}`;
      console.log('Madan prefs:', prefs);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

run();
