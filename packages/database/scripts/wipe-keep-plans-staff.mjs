/**
 * Wipe all app data except `plans`, then remove member users only
 * (keep admin + moderator).
 *
 * Usage: node packages/database/scripts/wipe-keep-plans-staff.mjs
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl:
    connectionString.includes('rds.amazonaws.com') ||
    connectionString.includes('sslmode=require')
      ? 'require'
      : undefined,
});

/** Tables to wipe (children first). Keep: plans, users (staff filtered later). */
const TABLES_TO_WIPE = [
  'messages',
  'chat_sessions',
  'unlocked_contacts',
  'blocked_profiles',
  'profile_views',
  'interests',
  'shortlists',
  'notifications',
  'payments',
  'subscriptions',
  'user_settings',
  'otp_attempts',
  'verifications',
  'profile_photos',
  'partner_preferences',
  'horoscopes',
  'lifestyle_interests',
  'family_details',
  'profiles',
];

async function main() {
  console.log('Connecting...');

  const existing = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY(${TABLES_TO_WIPE})
  `;
  const present = new Set(existing.map((r) => r.table_name));

  // Free locks from hung clients (do not kill ourselves).
  const killed = await sql`
    SELECT pg_terminate_backend(pid) AS killed
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
  `;
  console.log(`Terminated ${killed.filter((r) => r.killed).length} other DB session(s)`);

  await sql`SET lock_timeout = '30s'`;
  await sql`SET statement_timeout = '180s'`;

  console.log('Wiping data (keeping plans + staff users)...');

  // Single connection: do deletes sequentially outside nested pool calls.
  for (const table of TABLES_TO_WIPE) {
    if (!present.has(table)) {
      console.log(`  skip missing: ${table}`);
      continue;
    }
    const result = await sql.unsafe(`DELETE FROM "${table}"`);
    console.log(`  cleared: ${table} (${result.count ?? 0} rows)`);
  }

  const deleted = await sql`
    DELETE FROM users
    WHERE role = 'member'
    RETURNING id, phone, role
  `;
  console.log(`  deleted ${deleted.length} member user(s)`);

  const remaining = await sql`
    SELECT email, phone, role, status
    FROM users
    ORDER BY role, phone
  `;
  const planCount = await sql`SELECT count(*)::int AS n FROM plans`;
  const profileCount = await sql`SELECT count(*)::int AS n FROM profiles`;

  console.log(
    JSON.stringify(
      {
        ok: true,
        plans: planCount[0]?.n ?? 0,
        profiles: profileCount[0]?.n ?? 0,
        users: remaining,
      },
      null,
      2,
    ),
  );

  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  try {
    await sql.end({ timeout: 5 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
