import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../../.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function main() {
  console.log('Running database alterations...');

  try {
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_age_min DROP NOT NULL;`;
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_age_min DROP DEFAULT;`;
    console.log('pref_age_min updated');
  } catch (e: any) { console.error('Error on pref_age_min:', e.message); }

  try {
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_age_max DROP NOT NULL;`;
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_age_max DROP DEFAULT;`;
    console.log('pref_age_max updated');
  } catch (e: any) { console.error('Error on pref_age_max:', e.message); }

  try {
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_height_min_cm DROP NOT NULL;`;
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_height_min_cm DROP DEFAULT;`;
    console.log('pref_height_min_cm updated');
  } catch (e: any) { console.error('Error on pref_height_min_cm:', e.message); }

  try {
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_height_max_cm DROP NOT NULL;`;
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_height_max_cm DROP DEFAULT;`;
    console.log('pref_height_max_cm updated');
  } catch (e: any) { console.error('Error on pref_height_max_cm:', e.message); }

  try {
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_marital_statuses DROP DEFAULT;`;
    console.log('pref_marital_statuses updated');
  } catch (e: any) { console.error('Error on pref_marital_statuses:', e.message); }

  try {
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_religions DROP DEFAULT;`;
    console.log('pref_religions updated');
  } catch (e: any) { console.error('Error on pref_religions:', e.message); }

  try {
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_castes DROP DEFAULT;`;
    console.log('pref_castes updated');
  } catch (e: any) { console.error('Error on pref_castes:', e.message); }

  try {
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_mother_tongues DROP DEFAULT;`;
    console.log('pref_mother_tongues updated');
  } catch (e: any) { console.error('Error on pref_mother_tongues:', e.message); }
  
  try {
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_acceptable_incomes DROP DEFAULT;`;
    console.log('pref_acceptable_incomes updated');
  } catch (e: any) { console.error('Error on pref_acceptable_incomes:', e.message); }
  
  try {
    await client`ALTER TABLE partner_preferences ALTER COLUMN pref_locations DROP DEFAULT;`;
    console.log('pref_locations updated');
  } catch (e: any) { console.error('Error on pref_locations:', e.message); }

  try {
    await client`ALTER TABLE family_details ALTER COLUMN family_values DROP NOT NULL;`;
    await client`ALTER TABLE family_details ALTER COLUMN family_values DROP DEFAULT;`;
    console.log('family_values updated');
  } catch (e: any) { console.error('Error on family_values:', e.message); }

  try {
    await client`ALTER TABLE family_details ALTER COLUMN family_type DROP NOT NULL;`;
    await client`ALTER TABLE family_details ALTER COLUMN family_type DROP DEFAULT;`;
    console.log('family_type updated');
  } catch (e: any) { console.error('Error on family_type:', e.message); }

  try {
    await client`ALTER TABLE family_details ALTER COLUMN father_occupation DROP NOT NULL;`;
    await client`ALTER TABLE family_details ALTER COLUMN father_occupation DROP DEFAULT;`;
    console.log('father_occupation updated');
  } catch (e: any) { console.error('Error on father_occupation:', e.message); }

  try {
    await client`ALTER TABLE family_details ALTER COLUMN mother_occupation DROP NOT NULL;`;
    await client`ALTER TABLE family_details ALTER COLUMN mother_occupation DROP DEFAULT;`;
    console.log('mother_occupation updated');
  } catch (e: any) { console.error('Error on mother_occupation:', e.message); }

  try {
    await client`ALTER TABLE lifestyle_interests ALTER COLUMN diet DROP NOT NULL;`;
    await client`ALTER TABLE lifestyle_interests ALTER COLUMN diet DROP DEFAULT;`;
    console.log('diet updated');
  } catch (e: any) { console.error('Error on diet:', e.message); }

  console.log('Done.');
  process.exit(0);
}

main().catch(console.error);
