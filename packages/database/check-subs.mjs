import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require');

async function check() {
  const [maha] = await sql`SELECT user_id FROM profiles WHERE full_name = 'Mahalakshmi K'`;
  const subs = await sql`SELECT * FROM subscriptions WHERE user_id = ${maha.user_id}`;
  console.log('Subscriptions:', subs);
  
  const plansData = await sql`SELECT * FROM plans`;
  console.log('Plans:', plansData);
  
  await sql.end();
}

check().catch(console.error);
