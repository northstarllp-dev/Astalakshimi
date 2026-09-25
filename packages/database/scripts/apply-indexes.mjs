import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'C:\\Users\\Mahalakshmi K\\Polaris\\Astalakshimi\\.env' });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = postgres(connectionString);

  console.log('Adding profiles_discover_idx concurrently...');
  try {
    await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS profiles_discover_idx ON profiles (gender, required_complete, created_at);`;
    console.log('Successfully created profiles_discover_idx');
  } catch (err) {
    console.error('Error creating profiles_discover_idx:', err.message);
  }

  console.log('Adding profile_photos_primary_idx concurrently...');
  try {
    await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS profile_photos_primary_idx ON profile_photos (profile_id, is_primary);`;
    console.log('Successfully created profile_photos_primary_idx');
  } catch (err) {
    console.error('Error creating profile_photos_primary_idx:', err.message);
  }

  await sql.end();
}

run();
