import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const sql = postgres(process.env.DATABASE_URL);
const [occ] = await sql`SELECT count(*)::int AS c FROM occupations`;
const companies = await sql`SELECT name FROM companies WHERE name ILIKE '%Infosys%' LIMIT 3`;
console.log('occupations count:', occ.c);
console.log('Infosys matches:', companies);
await sql.end();
