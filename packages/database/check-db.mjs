import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/astalakshimi');

async function check() {
  const res = await sql`SELECT id, gender, profession, full_name, user_id FROM profiles LIMIT 50;`;
  console.log('Profiles:', res);
  await sql.end();
}

check().catch(console.error);
