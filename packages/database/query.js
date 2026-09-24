const postgres = require('postgres');
const sql = postgres('postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require');

async function run() {
  const all = await sql`SELECT count(*), min(height_cm), max(height_cm) FROM profiles`;
  console.log('Agg:', all);
  
  const range = await sql`SELECT count(*) FROM profiles WHERE height_cm >= 165 AND height_cm <= 173`;
  console.log('165-173:', range);
  
  const samp = await sql`SELECT height_cm FROM profiles LIMIT 10`;
  console.log('Sample:', samp);
  
  await sql.end();
}
run();
