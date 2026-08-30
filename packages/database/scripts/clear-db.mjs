import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

console.log("Connecting to database...");
const sql = postgres(dbUrl, { max: 1 });

async function clearDB() {
  try {
    console.log("Dropping schema public...");
    await sql`DROP SCHEMA public CASCADE;`;
    
    console.log("Recreating schema public...");
    await sql`CREATE SCHEMA public;`;
    await sql`GRANT ALL ON SCHEMA public TO postgres;`;
    await sql`GRANT ALL ON SCHEMA public TO public;`;
    
    console.log("Database cleared successfully!");
  } catch (err) {
    console.error("Failed to clear DB:", err);
  } finally {
    await sql.end();
  }
}

clearDB();
