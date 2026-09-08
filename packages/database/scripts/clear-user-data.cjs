const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const postgres = require('postgres');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('NO_DATABASE_URL');
  process.exit(1);
}

const host = url.replace(/^.*@/, '').replace(/\/.*$/, '').replace(/\?.*$/, '');
const isRds = host.includes('rds.amazonaws.com');
console.log('Target host:', host);

const sql = postgres(url, {
  ssl: isRds || url.includes('sslmode=require') ? 'require' : undefined,
  connect_timeout: 20,
  max: 1,
});

const USER_TABLES = [
  'messages',
  'chat_sessions',
  'unlocked_contacts',
  'blocked_profiles',
  'interests',
  'shortlists',
  'profile_views',
  'notifications',
  'payments',
  'subscriptions',
  'profile_photos',
  'verifications',
  'horoscopes',
  'lifestyle_interests',
  'family_details',
  'partner_preferences',
  'user_settings',
  'otp_attempts',
  'profiles',
  'users',
];

(async () => {
  try {
    const info = await sql`select current_database() as db, current_user as usr`;
    console.log('Connected:', info[0].db, info[0].usr);

    const before = await sql`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from profiles) as profiles
    `;
    console.log('Before:', before[0]);

    const existing = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any(${USER_TABLES})
    `;
    const names = existing.map((r) => r.table_name);
    if (names.length === 0) {
      console.error('No user tables found');
      process.exit(1);
    }

    await sql.unsafe(
      `TRUNCATE TABLE ${names.map((n) => `"${n}"`).join(', ')} RESTART IDENTITY CASCADE`,
    );

    const after = await sql`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from profiles) as profiles,
        (select count(*)::int from plans) as plans,
        (select count(*)::int from cities) as cities
    `;
    console.log('Cleared tables:', names.join(', '));
    console.log('After:', after[0]);
    await sql.end({ timeout: 5 });
    process.exit(0);
  } catch (e) {
    console.error('CLEAR_FAIL', e.code || '', e.message);
    try {
      await sql.end({ timeout: 1 });
    } catch {}
    process.exit(1);
  }
})();
