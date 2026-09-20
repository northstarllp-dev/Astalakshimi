/**
 * Throwaway-user E2E for lifestyle_interests fields (diet, smoking, alcohol, interests).
 *
 * Usage:
 *   npx tsx scripts/e2e-lifestyle.ts          # seed → PATCH → assert → cleanup
 *   npx tsx scripts/e2e-lifestyle.ts --keep   # leave user for UI follow-up (prints token)
 *   npx tsx scripts/e2e-lifestyle.ts --cleanup-only
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createHmac } from 'crypto';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../.env') });

const PHONE = '9000090055'; // throwaway — never a real member
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
    JSON.stringify({ sub: user.id, phone: user.phone, role: user.role, iat: now, exp: now + 60 * 60 }),
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
  const deleted = await sql`DELETE FROM users WHERE phone = ${PHONE} RETURNING id`;
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
      ${user.id}, 'self', 'Myself', 'Throwaway Lifestyle User', 'Male', '1995-06-15', 'Never Married',
      175, 'Chennai', 'Tamil Nadu', 'India', 'chennai-tamil-nadu',
      'Hindu', 'Brahmin', 'hindu-brahmin', 'Tamil',
      'Bachelors', 'B.Tech', 'Employed', 'Software Engineer', '₹10 – 15 Lakh',
      'blurred'
    )
    RETURNING id
  `;

  await sql`INSERT INTO family_details (profile_id, brothers_count, sisters_count) VALUES (${profile.id}, 0, 0)`;
  // Registration writes diet (required) + NULL smoking/alcohol + [] interests.
  await sql`
    INSERT INTO lifestyle_interests (profile_id, diet, smoking, alcohol, interests)
    VALUES (${profile.id}, 'Vegetarian', NULL, NULL, '[]'::jsonb)
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
  await sql`INSERT INTO horoscopes (profile_id, manglik) VALUES (${profile.id}, 'Don''t Know')`;

  console.log('Seeded throwaway user', { userId: user.id, profileId: profile.id, phone: PHONE });
  return { user: user as { id: string; phone: string; role: string }, profileId: profile.id as string };
}

async function assertLifestyle(
  profileId: string,
  expected: { diet: string | null; smoking: string | null; alcohol: string | null; interests: string[] },
) {
  const [row] = await sql`
    SELECT diet, smoking, alcohol, interests
    FROM lifestyle_interests WHERE profile_id = ${profileId}
  `;
  if (!row) throw new Error('lifestyle_interests row missing after PATCH');

  const mismatches: string[] = [];
  if (row.diet !== expected.diet) mismatches.push(`diet: want=${JSON.stringify(expected.diet)} got=${JSON.stringify(row.diet)}`);
  if (row.smoking !== expected.smoking) mismatches.push(`smoking: want=${JSON.stringify(expected.smoking)} got=${JSON.stringify(row.smoking)}`);
  if (row.alcohol !== expected.alcohol) mismatches.push(`alcohol: want=${JSON.stringify(expected.alcohol)} got=${JSON.stringify(row.alcohol)}`);
  const gotInterests = Array.isArray(row.interests) ? row.interests : [];
  const sameInterests =
    gotInterests.length === expected.interests.length &&
    expected.interests.every((t) => gotInterests.includes(t));
  if (!sameInterests) mismatches.push(`interests: want=${JSON.stringify(expected.interests)} got=${JSON.stringify(row.interests)}`);

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
    diet: 'Vegan',
    smoking: 'Occasionally',
    alcohol: 'Regularly',
    interests: ['✈ Travel', '📚 Reading', '🏏 Sports'],
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
  const ls = body.lifestyle;
  console.log('GET /profiles/me lifestyle:', ls);

  if (
    !ls ||
    ls.diet !== 'Vegan' ||
    ls.smoking !== 'Occasionally' ||
    ls.alcohol !== 'Regularly'
  ) {
    throw new Error('GET after PATCH did not reflect written lifestyle values');
  }
  const gotInterests = Array.isArray(ls.interests) ? ls.interests : [];
  if (gotInterests.length !== 3 || !patchBody.interests.every((t) => gotInterests.includes(t))) {
    throw new Error('GET after PATCH did not reflect written interests');
  }

  await assertLifestyle(profileId, {
    diet: 'Vegan',
    smoking: 'Occasionally',
    alcohol: 'Regularly',
    interests: patchBody.interests,
  });

  // Clear nullable lifestyle enums to NULL; interests to [].
  const clearRes = await fetch(`${API}/profiles/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ diet: null, smoking: null, alcohol: null, interests: [] }),
  });
  if (!clearRes.ok) {
    throw new Error(`Clear PATCH failed ${clearRes.status}: ${await clearRes.text()}`);
  }

  await assertLifestyle(profileId, { diet: null, smoking: null, alcohol: null, interests: [] });
  console.log('Clear → NULL assertion OK');

  if (KEEP) {
    // Re-seed readable values for UI follow-up
    await sql`
      UPDATE lifestyle_interests SET
        diet = 'Vegetarian',
        smoking = 'Never',
        alcohol = 'Never',
        interests = ${sql.json(['✈ Travel', '📚 Reading'])},
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
  console.log('\nAPI→DB lifestyle E2E PASSED');
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
