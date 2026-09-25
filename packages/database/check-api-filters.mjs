import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require');

async function check() {
  const result = await sql`
    SELECT p.id, p.full_name, p.profession 
    FROM profiles p
    WHERE p.gender = 'Male'
      AND p.required_complete = true
      AND EXISTS (SELECT 1 FROM profile_photos ph WHERE ph.profile_id = p.id AND ph.is_primary = true AND ph.status = 'approved')
      AND NOT EXISTS (
        SELECT 1 FROM user_settings
        WHERE user_settings.user_id = p.user_id
          AND (user_settings.hide_profile = true OR user_settings.profile_visibility = 'hidden')
      )
      AND p.profession IN ('Software Engineer')
  `;
  console.log('Software Engineers:', result);
  await sql.end();
}

check().catch(console.error);
