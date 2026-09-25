import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require');

async function approve() {
  await sql`
    UPDATE subscriptions
    SET plan_id = 'c8628330-6ee3-46a7-90b3-4bbb1fea23d7'
    WHERE user_id = (SELECT user_id FROM profiles WHERE full_name = 'Mahalakshmi K' LIMIT 1)
  `;
  console.log('Upgraded to Gold!');
  
  await sql.end();
}

approve().catch(console.error);
