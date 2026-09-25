import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require');

async function approve() {
  await sql`
    INSERT INTO verifications (profile_id, method, status)
    SELECT id, 'selfie', 'verified' FROM profiles WHERE gender = 'Male'
    ON CONFLICT (profile_id) DO UPDATE SET status = 'verified', updated_at = NOW()
  `;
  console.log('Set verified status for all males!');
  
  await sql.end();
}

approve().catch(console.error);
