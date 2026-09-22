import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  ssl: connectionString.includes('rds.amazonaws.com') || connectionString.includes('sslmode=require')
    ? 'require'
    : undefined,
});

async function main() {
  const passwordHash = sha256('Admin@2026');

  await sql`
    INSERT INTO users (phone, email, password_hash, role, is_phone_verified, consent_accepted, consent_timestamp, status)
    VALUES ('9999999999', 'admin@astalakshimi.in', ${passwordHash}, 'admin', true, true, NOW(), 'active')
    ON CONFLICT (phone) DO UPDATE SET
      email = 'admin@astalakshimi.in',
      password_hash = ${passwordHash},
      role = 'admin',
      status = 'active'
  `;
  console.log('Seeded admin@astalakshimi.in');

  await sql`
    INSERT INTO users (phone, email, password_hash, role, is_phone_verified, consent_accepted, consent_timestamp, status)
    VALUES ('8888888888', 'staff@astalakshimi.in', ${passwordHash}, 'moderator', true, true, NOW(), 'active')
    ON CONFLICT (phone) DO UPDATE SET
      email = 'staff@astalakshimi.in',
      password_hash = ${passwordHash},
      role = 'moderator',
      status = 'active'
  `;
  console.log('Seeded staff@astalakshimi.in (moderator)');

  const rows = await sql`
    SELECT email, phone, role, status
    FROM users
    WHERE role IN ('admin', 'moderator')
    ORDER BY role
  `;
  console.log(JSON.stringify(rows, null, 2));
  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
