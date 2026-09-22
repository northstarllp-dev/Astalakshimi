/**
 * Match-flow E2E fixtures.
 *
 * Seeds a viewer + two deterministic candidates directly in the dev DB (same
 * throwaway-user pattern as packages/database/scripts/e2e-edu-career.ts) and
 * mints an access token with the local JWT_SECRET — OTP login requires a real
 * SMS provider, so the browser tests authenticate via the BFF cookies instead.
 *
 * Deterministic scores (viewer prefs: age 25-35, Hindu, Brahmin, Tamil,
 * Bachelors+, Chennai, 150-190cm, Never Married):
 *   Candidate A → 40 base + 15 caste + 12 tongue + 12 education + 10 location
 *                 + 6 height + 5 age-fit = 100 → capped 98
 *   Candidate B → 40 base + 12 education + 6 height + 5 age-fit = 63
 *
 * All rows cascade from `users`, so cleanup deletes by phone.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createHmac } from 'node:crypto';

// pnpm doesn't hoist workspace deps to the repo root — resolve the pg client
// and dotenv from the package that owns them.
const dbRequire = createRequire(resolve(__dirname, '../../packages/database/package.json'));
const postgres = dbRequire('postgres') as typeof import('postgres').default;
const dotenv = dbRequire('dotenv') as typeof import('dotenv');

dotenv.config({ path: resolve(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set — check the root .env');
if (!JWT_SECRET) throw new Error('JWT_SECRET is not set — check the root .env');

export const VIEWER_PHONE = '9100000091';
export const CANDIDATE_A_PHONE = '9100000092';
export const CANDIDATE_B_PHONE = '9100000093';
const ALL_PHONES = [VIEWER_PHONE, CANDIDATE_A_PHONE, CANDIDATE_B_PHONE];

export const VIEWER_NAME = 'E2E Match Viewer';
export const CANDIDATE_A_NAME = 'E2E Candidate A';
export const CANDIDATE_B_NAME = 'E2E Candidate B';

let sql: ReturnType<typeof postgres> | null = null;

function db() {
  if (!sql) {
    sql = postgres(DATABASE_URL!, { max: 1, ssl: 'require' as any });
  }
  return sql!;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function mintAccessToken(user: { id: string; phone: string; role: string }) {
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

export interface MatchFixtures {
  token: string;
  viewerProfileId: string;
  candidateAProfileId: string;
  candidateBProfileId: string;
}

export async function cleanupMatchFixtures() {
  const dbi = db();
  for (const phone of ALL_PHONES) {
    await dbi`DELETE FROM users WHERE phone = ${phone}`;
  }
}

export async function closeMatchFixtures() {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

/**
 * Shared singleton connection so other fixture modules (e.g. the register
 * flow) reuse one pooled client instead of opening their own.
 */
export function getFixtureDb() {
  return db();
}

export async function closeFixtureDb() {
  await closeMatchFixtures();
}

/** Insert one complete, searchable candidate profile with a primary photo. */
async function seedProfile(opts: {
  userId: string;
  fullName: string;
  gender: 'Male' | 'Female';
  dob: string;
  heightCm: number;
  city: string;
  citySlug: string;
  caste: string;
  communitySlug: string;
  motherTongue: string;
}) {
  const dbi = db();
  const [profile] = await dbi`
    INSERT INTO profiles (
      user_id, created_by, profile_for, full_name, gender, dob, marital_status,
      height_cm, about_me, city, state, country, city_slug,
      religion, caste, community_slug, mother_tongue,
      education_level, degree, college_name, employment_status, profession, company_name, company_sector, annual_income,
      photo_privacy
    ) VALUES (
      ${opts.userId}, 'self', 'Myself', ${opts.fullName}, ${opts.gender}, ${opts.dob}, 'Never Married',
      ${opts.heightCm}, 'E2E fixture profile for matching tests.', ${opts.city}, 'Tamil Nadu', 'India', ${opts.citySlug},
      'Hindu', ${opts.caste}, ${opts.communitySlug}, ${opts.motherTongue},
      'Bachelors', 'B.Tech', 'E2E Institute', 'Employed', 'Software Engineer', 'E2E Corp', 'Private', '₹10 – 15 Lakh',
      'visible'
    )
    RETURNING id
  `;

  await dbi`
    INSERT INTO profile_photos (profile_id, s3_key, is_primary, display_order, status)
    VALUES (${profile.id}, ${`e2e/${opts.userId}/primary.webp`}, true, 0, 'approved')
  `;

  // Photos render unblurred on match cards only when the owner opts out of
  // the default "always blur" setting.
  await dbi`
    INSERT INTO user_settings (user_id, photo_blur)
    VALUES (${opts.userId}, 'never')
  `;

  return profile as { id: string };
}

export async function seedMatchFixtures(): Promise<MatchFixtures> {
  const dbi = db();
  await cleanupMatchFixtures();

  // --- Viewer: fully complete + verified so every portal gate opens ---
  const [viewerUser] = await dbi`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${VIEWER_PHONE}, true, true, NOW(), 'member', 'active')
    RETURNING id, phone, role
  `;
  const viewerProfile = await seedProfile({
    userId: viewerUser.id,
    fullName: VIEWER_NAME,
    gender: 'Male',
    dob: '1996-04-12',
    heightCm: 175,
    city: 'Chennai',
    citySlug: 'chennai-tamil-nadu',
    caste: 'Brahmin',
    communitySlug: 'hindu-brahmin',
    motherTongue: 'Tamil',
  });

  await dbi`
    INSERT INTO partner_preferences (
      profile_id, pref_age_min, pref_age_max, pref_height_min_cm, pref_height_max_cm,
      pref_marital_statuses, pref_religions, pref_castes, pref_mother_tongues,
      pref_min_education, pref_acceptable_incomes, pref_locations
    ) VALUES (
      ${viewerProfile.id}, 25, 35, 150, 190,
      ${JSON.stringify(['Never Married'])}::jsonb, ${JSON.stringify(['Hindu'])}::jsonb,
      ${JSON.stringify(['Brahmin'])}::jsonb, ${JSON.stringify(['Tamil'])}::jsonb,
      'Bachelors', ${JSON.stringify([])}::jsonb, ${JSON.stringify(['Chennai'])}::jsonb
    )
  `;

  // Required profile details for the portal gates (horoscope + verification + diet).
  await dbi`
    INSERT INTO lifestyle_interests (profile_id, diet, smoking, alcohol)
    VALUES (${viewerProfile.id}, 'Vegetarian', 'Never', 'Never')
  `;
  await dbi`
    INSERT INTO horoscopes (profile_id, birth_time, birth_place, manglik, rashi, nakshatra)
    VALUES (${viewerProfile.id}, '10:45 AM', 'Chennai', 'No', 'Mesha', 'Ashwini')
  `;
  await dbi`
    INSERT INTO verifications (profile_id, method, status)
    VALUES (${viewerProfile.id}, 'selfie', 'verified')
  `;

  // --- Candidate A: every soft dimension matches → deterministic 98% ---
  const [aUser] = await dbi`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${CANDIDATE_A_PHONE}, true, true, NOW(), 'member', 'active')
    RETURNING id, phone, role
  `;
  const candidateA = await seedProfile({
    userId: aUser.id,
    fullName: CANDIDATE_A_NAME,
    gender: 'Female',
    dob: '1998-03-10',
    heightCm: 165,
    city: 'Chennai',
    citySlug: 'chennai-tamil-nadu',
    caste: 'Brahmin',
    communitySlug: 'hindu-brahmin',
    motherTongue: 'Tamil',
  });

  // --- Candidate B: partial match (63%) for a second data point ---
  const [bUser] = await dbi`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${CANDIDATE_B_PHONE}, true, true, NOW(), 'member', 'active')
    RETURNING id, phone, role
  `;
  const candidateB = await seedProfile({
    userId: bUser.id,
    fullName: CANDIDATE_B_NAME,
    gender: 'Female',
    dob: '1997-05-20',
    heightCm: 165,
    city: 'Coimbatore',
    citySlug: 'coimbatore-tamil-nadu',
    caste: 'Nadar',
    communitySlug: 'hindu-nadar',
    motherTongue: 'Telugu',
  });

  return {
    token: mintAccessToken(viewerUser as { id: string; phone: string; role: string }),
    viewerProfileId: viewerProfile.id,
    candidateAProfileId: candidateA.id,
    candidateBProfileId: candidateB.id,
  };
}
