import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require');

async function approve() {
  await sql`UPDATE profile_photos SET status = 'approved' WHERE s3_key LIKE 'dummy_photo_%'`;
  console.log('Approved photos!');
  
  // also check if any other male photos are not approved
  await sql`UPDATE profile_photos SET status = 'approved' WHERE profile_id IN (SELECT id FROM profiles WHERE gender = 'Male')`;
  
  await sql.end();
}

approve().catch(console.error);
