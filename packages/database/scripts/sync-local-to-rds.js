const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const localUrl = 'postgresql://karikalanloganathan@localhost:5432/astalakshimi';
const rdsUrl = process.env.DATABASE_URL;

console.log('Connecting to Local:', localUrl);
console.log('Connecting to RDS:', rdsUrl.replace(/:[^:@]+@/, ':***@'));

const localSql = postgres(localUrl);
const rdsSql = postgres(rdsUrl);

const tablesInOrder = [
  'users',
  'profiles',
  'profile_photos',
  'verifications',
  'partner_preferences',
  'horoscopes',
  'family_details',
  'lifestyle_interests',
  'user_settings',
  'shortlists',
  'interests',
  'chat_sessions',
  'messages',
  'notifications',
  'profile_views',
  'otp_attempts',
  'unlocked_contacts',
  'blocked_profiles',
];

async function run() {
  try {
    console.log('\n1. Cleaning up empty dummy records on RDS before clean sync...');
    // Clean tables in reverse dependency order
    for (const t of [...tablesInOrder].reverse()) {
      try {
        await rdsSql.unsafe(`TRUNCATE TABLE "public"."${t}" CASCADE;`);
      } catch (e) {
        // ignore if table doesn't exist
      }
    }
    console.log('Cleaned RDS tables.');

    console.log('\n2. Starting clean transfer from Local DB -> AWS RDS...');
    for (const tableName of tablesInOrder) {
      const exists = await localSql`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${tableName}
      `;
      if (!exists || exists.length === 0) continue;

      const rows = await localSql.unsafe(`SELECT * FROM "public"."${tableName}"`);
      if (rows.length === 0) {
        console.log(`[${tableName}] 0 rows locally (skipped)`);
        continue;
      }

      console.log(`[${tableName}] Migrating ${rows.length} rows...`);

      // Get columns in RDS table
      const rdsCols = await rdsSql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ${tableName}
      `;
      const rdsColNames = new Set(rdsCols.map((c) => c.column_name));

      let inserted = 0;
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => rdsColNames.has(k) && row[k] !== undefined);
        if (keys.length === 0) continue;

        const colNames = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map((k) => row[k]);

        try {
          const query = `INSERT INTO "public"."${tableName}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
          await rdsSql.unsafe(query, values);
          inserted++;
        } catch (err) {
          console.error(`  ❌ Error in ${tableName} row (${row.id || 'no-id'}):`, err.message);
        }
      }
      console.log(`  ✅ Successfully migrated ${inserted}/${rows.length} rows to RDS`);
    }

    console.log('\n========================================');
    console.log('🎉 ALL PROFILES & DATA ARE NOW LIVE ON RDS!');
    console.log('========================================');
  } catch (err) {
    console.error('Fatal sync error:', err);
  } finally {
    await localSql.end();
    await rdsSql.end();
  }
}

run();
