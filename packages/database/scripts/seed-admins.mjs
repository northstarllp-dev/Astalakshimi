import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

async function main() {
  console.log('Seeding admin accounts...');

  const passwordHash = sha256('Admin@2026'); // Common password for demo

  try {
    // Add Admin
    await sql`
      INSERT INTO users (phone, email, password_hash, role, is_phone_verified, consent_accepted, consent_timestamp)
      VALUES ('9999999999', 'admin@astalakshimi.in', ${passwordHash}, 'admin', true, true, NOW())
      ON CONFLICT (phone) DO UPDATE SET email = 'admin@astalakshimi.in', password_hash = ${passwordHash}, role = 'admin'
    `;
    console.log('Added admin@astalakshimi.in (Phone: 9999999999)');

    // Add Staff
    await sql`
      INSERT INTO users (phone, email, password_hash, role, is_phone_verified, consent_accepted, consent_timestamp)
      VALUES ('8888888888', 'staff@astalakshimi.in', ${passwordHash}, 'moderator', true, true, NOW())
      ON CONFLICT (phone) DO UPDATE SET email = 'staff@astalakshimi.in', password_hash = ${passwordHash}, role = 'moderator'
    `;
    console.log('Added staff@astalakshimi.in (Phone: 8888888888)');
  } catch (err) {
    console.error('Error during insert:', err);
  } finally {
    await sql.end();
  }

  console.log('Seeding completed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error seeding admins:', err);
  process.exit(1);
});
