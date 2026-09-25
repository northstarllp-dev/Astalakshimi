import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require');

async function check() {
  const allMales = await sql`SELECT id, full_name, profession, required_complete, dob FROM profiles WHERE gender = 'Male'`;
  console.log('All males:', allMales);
  
  const photos = await sql`SELECT profile_id, is_primary FROM profile_photos`;
  console.log('Photos:', photos);
  
  const withPhoto = await sql`
    SELECT p.id, p.full_name, p.profession 
    FROM profiles p
    WHERE p.gender = 'Male' 
      AND p.required_complete = true
      AND EXISTS (SELECT 1 FROM profile_photos ph WHERE ph.profile_id = p.id AND ph.is_primary = true)
  `;
  console.log('With photo and required_complete:', withPhoto);
  
  await sql.end();
}

check().catch(console.error);
