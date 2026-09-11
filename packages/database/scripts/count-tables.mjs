import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(root, '.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

const exactTables = [
  'profiles',
  'users',
  'states',
  'cities',
  'city_aliases',
  'education_levels',
  'specializations',
  'education_aliases',
  'occupations',
  'occupation_aliases',
  'companies',
  'company_aliases',
  'communities',
  'community_aliases',
  'gotras',
  'gotra_aliases',
  'subcastes',
  'subcaste_aliases',
  'plans',
  'profile_photos',
  'payments',
  'subscriptions',
  'interests',
  'shortlists',
  'notifications',
  'otp_attempts',
];

try {
  const exact = {};
  for (const t of exactTables) {
    const r = await sql.unsafe(`SELECT count(*)::int AS n FROM "${t}"`);
    exact[t] = r[0].n;
  }

  // Smoke queries used by API autocomplete paths
  const smoke = {};
  smoke.citySearch = (
    await sql`
      SELECT c.id, c.name, s.name AS state
      FROM cities c
      JOIN states s ON s.id = c.state_id
      WHERE c.name ILIKE ${'Chen%'}
      ORDER BY c.name
      LIMIT 5
    `
  ).length;
  smoke.occupationSearch = (
    await sql`
      SELECT id, name FROM occupations WHERE name ILIKE ${'Eng%'} ORDER BY name LIMIT 5
    `
  ).length;
  smoke.communitySearch = (
    await sql`
      SELECT id, name, religion FROM communities WHERE name ILIKE ${'Brah%'} ORDER BY name LIMIT 5
    `
  ).length;
  smoke.educationSearch = (
    await sql`
      SELECT id, name FROM education_levels WHERE name ILIKE ${'B.%'} ORDER BY name LIMIT 5
    `
  ).length;
  smoke.plansActive = (await sql`SELECT id, name FROM plans LIMIT 10`).map((p) => p.name);

  // Verify created_by present and usable
  smoke.createdByCheck = (
    await sql`
      SELECT created_by, count(*)::int AS n
      FROM profiles
      GROUP BY created_by
    `
  );

  const out = { exact, smoke, emptyMasterTables: Object.entries(exact).filter(([k, v]) => k.includes('_') === false ? false : false) };
  // flag empty master/reference tables
  const master = [
    'states',
    'cities',
    'education_levels',
    'occupations',
    'companies',
    'communities',
    'gotras',
    'subcastes',
    'plans',
  ];
  out.emptyOrSparseMaster = master
    .map((t) => ({ table: t, rows: exact[t] }))
    .filter((x) => x.rows === 0);

  const outPath = path.join(root, 'scratch/db-schema-audit/table-counts.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
} finally {
  await sql.end();
}
