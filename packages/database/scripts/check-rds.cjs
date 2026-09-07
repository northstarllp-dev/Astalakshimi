const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const postgres = require('postgres');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('NO_DATABASE_URL');
  process.exit(1);
}

const host = url.replace(/^.*@/, '').replace(/\/.*$/, '').replace(/\?.*$/, '');
console.log('Target host:', host);

const sql = postgres(url, { ssl: 'require', connect_timeout: 15, max: 1 });

(async () => {
  try {
    const r = await sql`select current_database() as db, current_user as usr, now() as ts`;
    console.log('RDS_OK', JSON.stringify(r[0]));
    const tables = await sql`
      select count(*)::int as n
      from information_schema.tables
      where table_schema = 'public'
    `;
    console.log('public_tables', tables[0].n);
    await sql.end({ timeout: 5 });
    process.exit(0);
  } catch (e) {
    console.error('RDS_FAIL', e.code || '', e.message);
    try {
      await sql.end({ timeout: 1 });
    } catch {}
    process.exit(1);
  }
})();
