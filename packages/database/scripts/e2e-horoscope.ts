/**
 * Throwaway-user E2E for horoscopes table fields.
 *
 * Usage:
 *   npx tsx scripts/e2e-horoscope.ts          # seed → PATCH → assert → cleanup
 *   npx tsx scripts/e2e-horoscope.ts --keep   # leave user for UI follow-up (prints token)
 *   npx tsx scripts/e2e-horoscope.ts --cleanup-only
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createHmac } from 'crypto';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../.env') });

const PHONE = '9000090011'; // throwaway — never a real member
const API = process.env.API_BASE || 'http://localhost:4000/api';
const KEEP = process.argv.includes('--keep');
const CLEANUP_ONLY = process.argv.includes('--cleanup-only');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!JWT_SECRET) throw new Error('JWT_SECRET is not set');

const sql = postgres(DATABASE_URL, { max: 1, ssl: 'require' as any });

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function mintAccessToken(user: { id: string; phone: string; role: string }) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      iat: now,
      exp: now + 60 * 60,
    }),
  );
  const sig = createHmac('sha256', JWT_SECRET!)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${payload}.${sig}`;
}

async function cleanup() {
  const deleted = await sql`
    DELETE FROM users WHERE phone = ${PHONE} RETURNING id
  `;
  console.log(`Cleanup: deleted ${deleted.length} throwaway user(s)`);
}

async function seed() {
  await cleanup();

  const [user] = await sql`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${PHONE}, true, true, NOW(), 'member', 'active')
    RETURNING id, phone, role
  `;

  // Valid full_name for profile-edit Zod (letters + spaces only — no "E2E")
  const [profile] = await sql`
    INSERT INTO profiles (
      user_id, created_by, profile_for, full_name, gender, dob, marital_status,
      height_cm, city, state, country, city_slug,
      religion, caste, community_slug, mother_tongue,
      education_level, degree, employment_status, profession, annual_income,
      photo_privacy
    ) VALUES (
      ${user.id}, 'self', 'Myself', 'Throwaway Horoscope User', 'Male', '1995-06-15', 'Never Married',
      175, 'Chennai', 'Tamil Nadu', 'India', 'chennai-tamil-nadu',
      'Hindu', 'Brahmin', 'hindu-brahmin', 'Tamil',
      'Bachelors', 'B.Tech', 'Employed', 'Software Engineer', '₹10 – 15 Lakh',
      'blurred'
    )
    RETURNING id
  `;

  // Minimal related rows so edit save does not fail on missing graph pieces
  await sql`
    INSERT INTO family_details (profile_id, brothers_count, sisters_count)
    VALUES (${profile.id}, 0, 0)
  `;
  await sql`
    INSERT INTO lifestyle_interests (profile_id, diet, smoking, alcohol, interests)
    VALUES (${profile.id}, 'Vegetarian', 'Never', 'Never', '[]'::jsonb)
  `;
  await sql`
    INSERT INTO partner_preferences (
      profile_id, pref_age_min, pref_age_max,
      pref_marital_statuses, pref_religions, pref_castes, pref_mother_tongues,
      pref_acceptable_incomes, pref_locations
    ) VALUES (
      ${profile.id}, 24, 32,
      ${sql.json(['Never Married'])}, ${sql.json(['Hindu'])}, ${sql.json([])}, ${sql.json([])},
      ${sql.json([])}, ${sql.json([])}
    )
  `;
  await sql`
    INSERT INTO horoscopes (profile_id, manglik)
    VALUES (${profile.id}, 'Don''t Know')
  `;

  console.log('Seeded throwaway user', { userId: user.id, profileId: profile.id, phone: PHONE });
  return { user: user as { id: string; phone: string; role: string }, profileId: profile.id as string };
}

async function assertDb(
  profileId: string,
  expected: Record<string, string | number | null>,
) {
  const [row] = await sql`
    SELECT birth_time, birth_place, manglik, rashi, nakshatra,
           horoscope_s3_key, horoscope_file_name, horoscope_file_size_bytes
    FROM horoscopes WHERE profile_id = ${profileId}
  `;
  if (!row) throw new Error('horoscopes row missing after PATCH');

  const mismatches: string[] = [];
  for (const [key, want] of Object.entries(expected)) {
    const got = (row as any)[key] ?? null;
    if (got !== want) mismatches.push(`${key}: want=${JSON.stringify(want)} got=${JSON.stringify(got)}`);
  }
  if (mismatches.length) {
    throw new Error(`DB assertion failed:\n  ${mismatches.join('\n  ')}`);
  }
  console.log('DB assertion OK:', row);
}

async function main() {
  if (CLEANUP_ONLY) {
    await cleanup();
    await sql.end();
    return;
  }

  const { user, profileId } = await seed();
  const token = mintAccessToken(user);
  console.log('Minted JWT (first 24 chars):', token.slice(0, 24) + '…');

  const patchBody = {
    birthTime: '10:45 AM',
    birthPlace: 'Madurai',
    manglik: 'No',
    rashi: 'Mesha',
    nakshatra: 'Ashwini',
    // Synthetic key shape matching ownership pattern (no real S3 upload in this script)
    horoscopeS3Key: `profiles/${user.id}/horoscopes/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.pdf`,
    horoscopeFileName: 'kundli-e2e.pdf',
    horoscopeFileSizeBytes: 2048,
  };

  const res = await fetch(`${API}/profiles/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patchBody),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PATCH /profiles/me failed ${res.status}: ${text}`);
  }
  console.log('PATCH /profiles/me →', res.status);

  const getRes = await fetch(`${API}/profiles/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await getRes.json();
  const h = body.horoscope;
  console.log('GET /profiles/me horoscope:', h);

  if (
    !h ||
    h.birthTime !== '10:45 AM' ||
    h.birthPlace !== 'Madurai' ||
    h.manglik !== 'No' ||
    h.rashi !== 'Mesha' ||
    h.nakshatra !== 'Ashwini' ||
    h.horoscopeFileName !== 'kundli-e2e.pdf' ||
    h.horoscopeFileSizeBytes !== 2048
  ) {
    throw new Error('GET after PATCH did not reflect written horoscope values');
  }

  await assertDb(profileId, {
    birth_time: '10:45 AM',
    birth_place: 'Madurai',
    manglik: 'No',
    rashi: 'Mesha',
    nakshatra: 'Ashwini',
    horoscope_s3_key: patchBody.horoscopeS3Key,
    horoscope_file_name: 'kundli-e2e.pdf',
    horoscope_file_size_bytes: 2048,
  });

  // Clear optional text/file fields → NULL (must send null, not "")
  const clearRes = await fetch(`${API}/profiles/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      birthTime: null,
      birthPlace: null,
      rashi: null,
      nakshatra: null,
      horoscopeS3Key: null,
      horoscopeFileName: null,
      horoscopeFileSizeBytes: null,
      // manglik stays No — NOT NULL, not cleared
    }),
  });
  if (!clearRes.ok) {
    throw new Error(`Clear PATCH failed ${clearRes.status}: ${await clearRes.text()}`);
  }

  await assertDb(profileId, {
    birth_time: null,
    birth_place: null,
    manglik: 'No',
    rashi: null,
    nakshatra: null,
    horoscope_s3_key: null,
    horoscope_file_name: null,
    horoscope_file_size_bytes: null,
  });
  console.log('Clear → NULL assertion OK');

  if (KEEP) {
    // Re-seed readable values for UI follow-up
    await sql`
      UPDATE horoscopes SET
        birth_time = '09:30 AM',
        birth_place = 'Chennai',
        manglik = 'No',
        rashi = 'Mesha',
        nakshatra = 'Ashwini',
        horoscope_s3_key = NULL,
        horoscope_file_name = NULL,
        horoscope_file_size_bytes = NULL,
        updated_at = NOW()
      WHERE profile_id = ${profileId}
    `;
    console.log('\n--keep mode: user left in DB for UI follow-up');
    console.log('TOKEN=' + token);
    console.log('USER_ID=' + user.id);
    console.log('PROFILE_ID=' + profileId);
    console.log('PHONE=' + PHONE);
  } else {
    await cleanup();
  }

  await sql.end();
  console.log('\nAPI→DB horoscope E2E PASSED');
}

main().catch(async (e) => {
  console.error(e);
  try {
    await cleanup();
  } catch {
    /* ignore */
  }
  try {
    await sql.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
