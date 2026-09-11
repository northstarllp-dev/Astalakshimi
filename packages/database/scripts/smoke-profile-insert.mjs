/**
 * Smoke-test profile + related table inserts against live enums.
 * Creates a throwaway user, inserts full profile graph, then deletes it.
 */
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

const userId = randomUUID();
const profileId = randomUUID();
const phone = `9${String(Date.now()).slice(-9)}`;

try {
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO users (id, phone, role, is_phone_verified, consent_accepted)
      VALUES (${userId}::uuid, ${phone}, 'member', true, true)
    `;

    await tx`
      INSERT INTO profiles (
        id, user_id, created_by, profile_for, full_name, gender, dob, marital_status,
        height_cm, city, state, country, religion, caste, mother_tongue,
        education_level, employment_status, company_sector, photo_privacy,
        subcaste, gotra, about_me, company_name, annual_income
      ) VALUES (
        ${profileId}::uuid, ${userId}::uuid, 'self', 'Myself', 'Audit Test User',
        'Female', '1998-01-15', 'Never Married',
        165, 'Chennai', 'Tamil Nadu', 'India', 'Hindu', 'Brahmin', 'Tamil',
        'Bachelors', 'Employed', NULL, 'blurred',
        NULL, NULL, NULL, NULL, NULL
      )
    `;

    await tx`
      INSERT INTO family_details (
        profile_id, family_values, family_type, father_occupation, mother_occupation,
        brothers_count, sisters_count
      ) VALUES (
        ${profileId}::uuid, 'Moderate', 'Nuclear', 'Employed', 'Homemaker', 0, 0
      )
    `;

    await tx`
      INSERT INTO lifestyle_interests (
        profile_id, diet, smoking, alcohol, interests
      ) VALUES (
        ${profileId}::uuid, 'Vegetarian', 'Never', 'Never', '[]'::jsonb
      )
    `;

    await tx`
      INSERT INTO horoscopes (
        profile_id, birth_time, birth_place, manglik, rashi, nakshatra
      ) VALUES (
        ${profileId}::uuid, '10:30 AM', 'Chennai', 'Don''t Know', 'Mesha', 'Ashwini'
      )
    `;

    await tx`
      INSERT INTO partner_preferences (
        profile_id, pref_age_min, pref_age_max, pref_religions
      ) VALUES (
        ${profileId}::uuid, 24, 32, '["Hindu"]'::jsonb
      )
    `;

    await tx`
      INSERT INTO verifications (
        profile_id, method, status
      ) VALUES (
        ${profileId}::uuid, 'selfie', 'pending'
      )
    `;

    const counts = await tx`
      SELECT
        (SELECT count(*)::int FROM profiles WHERE id = ${profileId}::uuid) AS profiles,
        (SELECT count(*)::int FROM family_details WHERE profile_id = ${profileId}::uuid) AS family,
        (SELECT count(*)::int FROM lifestyle_interests WHERE profile_id = ${profileId}::uuid) AS lifestyle,
        (SELECT count(*)::int FROM horoscopes WHERE profile_id = ${profileId}::uuid) AS horoscopes,
        (SELECT count(*)::int FROM partner_preferences WHERE profile_id = ${profileId}::uuid) AS prefs,
        (SELECT count(*)::int FROM verifications WHERE profile_id = ${profileId}::uuid) AS verifications
    `;

    console.log(JSON.stringify({
      ok: true,
      relatedRows: counts[0],
      note: 'Rolling back test transaction (no leftover data)',
    }, null, 2));

    throw new Error('ROLLBACK_SMOKE_TEST');
  });
} catch (e) {
  if (String(e.message || e).includes('ROLLBACK_SMOKE_TEST')) {
    // Separate check: empty string must be rejected by enum
    let emptyEnumRejected = false;
    try {
      await sql`UPDATE profiles SET company_sector = ${''} WHERE false`;
    } catch (err) {
      emptyEnumRejected =
        String(err.message || err).includes('company_sector') ||
        String(err.message || err).includes('enum') ||
        err.code === '22P02';
    }
    console.log(JSON.stringify({ emptyEnumRejected }, null, 2));
    if (!emptyEnumRejected) {
      console.error('Expected empty company_sector to be rejected');
      process.exit(1);
    }
    console.log('Smoke test passed; transaction rolled back.');
  } else {
    console.error('Smoke test failed:', e);
    process.exit(1);
  }
} finally {
  await sql.end();
}
