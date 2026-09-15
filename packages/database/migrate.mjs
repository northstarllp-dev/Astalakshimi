import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/astalakshimi');

async function main() {
  console.log("Starting raw SQL migration...");
  await sql`ALTER TABLE profiles ADD COLUMN weight VARCHAR(50);`.catch(e => console.log(e.message));
  await sql`ALTER TABLE profiles ADD COLUMN complexion VARCHAR(50);`.catch(e => console.log(e.message));
  await sql`ALTER TABLE profiles ADD COLUMN disability VARCHAR(100);`.catch(e => console.log(e.message));
  await sql`ALTER TABLE profiles ADD COLUMN willing_to_relocate VARCHAR(50);`.catch(e => console.log(e.message));
  await sql`ALTER TABLE profiles ALTER COLUMN height_cm DROP NOT NULL;`.catch(e => console.log(e.message));
  
  await sql`ALTER TABLE family_details ADD COLUMN family_status VARCHAR(50);`.catch(e => console.log(e.message));
  await sql`ALTER TABLE family_details ALTER COLUMN family_values DROP NOT NULL;`.catch(e => console.log(e.message));
  await sql`ALTER TABLE family_details ALTER COLUMN family_type DROP NOT NULL;`.catch(e => console.log(e.message));
  await sql`ALTER TABLE family_details ALTER COLUMN father_occupation DROP NOT NULL;`.catch(e => console.log(e.message));
  await sql`ALTER TABLE family_details ALTER COLUMN mother_occupation DROP NOT NULL;`.catch(e => console.log(e.message));
  
  await sql`ALTER TABLE lifestyle_interests ALTER COLUMN diet DROP NOT NULL;`.catch(e => console.log(e.message));
  await sql`ALTER TABLE lifestyle_interests ALTER COLUMN smoking DROP NOT NULL;`.catch(e => console.log(e.message));
  await sql`ALTER TABLE lifestyle_interests ALTER COLUMN alcohol DROP NOT NULL;`.catch(e => console.log(e.message));
  await sql`ALTER TABLE lifestyle_interests ALTER COLUMN smoking DROP DEFAULT;`.catch(e => console.log(e.message));
  await sql`ALTER TABLE lifestyle_interests ALTER COLUMN alcohol DROP DEFAULT;`.catch(e => console.log(e.message));
  
  console.log("Done");
  process.exit(0);
}

main();
