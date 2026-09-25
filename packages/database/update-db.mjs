import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/astalakshimi');

async function check() {
  await sql`UPDATE profiles SET profession = 'Software Engineer' WHERE full_name = 'Hari';`;
  console.log('Updated Hari to Software Engineer!');
  
  const res = await sql`SELECT id, gender, profession, full_name, user_id FROM profiles LIMIT 50;`;
  console.log('Profiles:', res);
  await sql.end();
}

check().catch(console.error);
