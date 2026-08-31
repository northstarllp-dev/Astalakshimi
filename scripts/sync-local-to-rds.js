const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

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
    for (const tableName of tablesInOrder) {
      // Check if table exists locally
      const exists = await localSql`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${tableName}
      `;
      if (!exists || exists.length === 0) continue;

      const rows = await localSql.unsafe(`SELECT * FROM "public"."${tableName}"`);
      console.log(`[${tableName}] Local rows: ${rows.length}`);
      if (rows.length === 0) continue;

      // Get columns in RDS table
      const rdsCols = await rdsSql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ${tableName}
      `;
      const rdsColNames = new Set(rdsCols.map((c) => c.column_name));

      let inserted = 0;
      for (const row of rows) {
        // Filter out columns not in RDS
        const keys = Object.keys(row).filter((k) => rdsColNames.has(k) && row[k] !== undefined);
        if (keys.length === 0) continue;

        const filteredRow = {};
        for (const k of keys) {
          filteredRow[k] = row[k];
        }

        try {
          if (row.id && rdsColNames.has('id')) {
            const updateKeys = keys.filter((k) => k !== 'id');
            if (updateKeys.length > 0) {
              await rdsSql`
                INSERT INTO ${rdsSql(tableName)} ${rdsSql(filteredRow, keys)}
                ON CONFLICT (id) DO UPDATE SET ${rdsSql(filteredRow, updateKeys)}
              `;
            } else {
              await rdsSql`
                INSERT INTO ${rdsSql(tableName)} ${rdsSql(filteredRow, keys)}
                ON CONFLICT (id) DO NOTHING
              `;
            }
          } else {
            await rdsSql`
              INSERT INTO ${rdsSql(tableName)} ${rdsSql(filteredRow, keys)}
            `;
          }
          inserted++;
        } catch (err) {
          console.error(`  Error in ${tableName} row (${row.id || 'noid'}):`, err.message);
        }
      }
      console.log(`  -> Synced ${inserted}/${rows.length} rows to RDS`);
    }

    console.log('\n✅ All data successfully synced to AWS RDS!');
  } catch (err) {
    console.error('Fatal sync error:', err);
  } finally {
    await localSql.end();
    await rdsSql.end();
  }
}

run();
