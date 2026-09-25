import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/astalakshimi'
});

async function check() {
  await client.connect();
  const res = await client.query('SELECT id, gender, profession FROM profiles LIMIT 20;');
  console.log('Profiles:', res.rows);
  await client.end();
}

check().catch(console.error);
