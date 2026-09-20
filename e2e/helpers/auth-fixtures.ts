/**
 * Fixtures for login / register / admin-review Playwright flows.
 *
 * Member OTP: we seed a known otp_attempts row and stub send-otp in the browser
 * so e2e does not depend on SMS delivery. Verify still hits the real API + DB.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createHash, createHmac, randomUUID } from 'node:crypto';

const dbRequire = createRequire(resolve(__dirname, '../../packages/database/package.json'));
const postgres = dbRequire('postgres') as typeof import('postgres').default;
const dotenv = dbRequire('dotenv') as typeof import('dotenv');

dotenv.config({ path: resolve(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!JWT_SECRET) throw new Error('JWT_SECRET is not set');

export const MEMBER_PHONE = '9100000081';
export const MEMBER_NAME = 'E2E Login Member';
export const PENDING_PHONE = '9100000082';
export const PENDING_NAME = 'E2E Pending Review';
export const ADMIN_EMAIL = 'admin@astalakshimi.in';
export const ADMIN_PASSWORD = 'Admin@2026';
export const ADMIN_PHONE = '9999999999';
/** Fixed OTP used by login e2e after stubbing send-otp. */
export const E2E_OTP = '424242';

const ALL_MEMBER_PHONES = [MEMBER_PHONE, PENDING_PHONE];

let sql: ReturnType<typeof postgres> | null = null;

function db() {
  if (!sql) sql = postgres(DATABASE_URL!, { max: 1, ssl: 'require' as any });
  return sql!;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
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
    JSON.stringify({ sub: user.id, phone: user.phone, role: user.role, iat: now, exp: now + 3600 }),
  );
  const sig = createHmac('sha256', JWT_SECRET!)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${payload}.${sig}`;
}

export async function cleanupAuthFixtures() {
  const dbi = db();
  await dbi`DELETE FROM otp_attempts WHERE phone IN (${MEMBER_PHONE}, ${PENDING_PHONE})`;
  await dbi`DELETE FROM users WHERE phone IN (${MEMBER_PHONE}, ${PENDING_PHONE})`;
}

export async function closeAuthFixtures() {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

/** Ensure demo admin exists with known password (idempotent). */
export async function ensureAdminUser() {
  const dbi = db();
  const passwordHash = sha256(ADMIN_PASSWORD);
  await dbi`
    INSERT INTO users (phone, email, password_hash, role, is_phone_verified, consent_accepted, consent_timestamp, status)
    VALUES (${ADMIN_PHONE}, ${ADMIN_EMAIL}, ${passwordHash}, 'admin', true, true, NOW(), 'active')
    ON CONFLICT (phone) DO UPDATE SET
      email = ${ADMIN_EMAIL},
      password_hash = ${passwordHash},
      role = 'admin',
      status = 'active'
  `;
}

export async function seedOtp(phone: string, otp = E2E_OTP) {
  const dbi = db();
  await dbi`DELETE FROM otp_attempts WHERE phone = ${phone}`;
  await dbi`
    INSERT INTO otp_attempts (phone, otp_hash, expires_at, consent_accepted, attempts)
    VALUES (${phone}, ${sha256(otp)}, ${new Date(Date.now() + 10 * 60 * 1000)}, true, 0)
  `;
}

async function seedCompleteMember(phone: string, fullName: string, opts?: { pendingReview?: boolean }) {
  const dbi = db();
  const [user] = await dbi`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${phone}, true, true, NOW(), 'member', 'active')
    RETURNING id, phone, role
  `;

  const [profile] = await dbi`
    INSERT INTO profiles (
      user_id, created_by, profile_for, full_name, gender, dob, marital_status,
      height_cm, city, state, country, city_slug,
      religion, caste, community_slug, mother_tongue,
      education_level, employment_status, profession, annual_income,
      photo_privacy, about_me
    ) VALUES (
      ${user.id}, 'self', 'Myself', ${fullName}, 'Female', '1998-06-15', 'Never Married',
      162, 'Chennai', 'Tamil Nadu', 'India', 'chennai-tamil-nadu',
      'Hindu', 'Brahmin', 'hindu-brahmin', 'Tamil',
      'Bachelors', 'Employed', 'Engineer', '₹10 – 15 Lakh',
      'visible', 'E2E profile for auth/admin flows.'
    )
    RETURNING id
  `;

  await dbi`
    INSERT INTO lifestyle_interests (profile_id, diet, smoking, alcohol)
    VALUES (${profile.id}, 'Vegetarian', 'Never', 'Never')
  `;
  await dbi`
    INSERT INTO horoscopes (profile_id, birth_time, birth_place, manglik, rashi, nakshatra)
    VALUES (${profile.id}, '10:30 AM', 'Chennai', 'No', 'Mesha', 'Ashwini')
  `;
  await dbi`
    INSERT INTO partner_preferences (
      profile_id, pref_age_min, pref_age_max,
      pref_marital_statuses, pref_religions, pref_castes, pref_mother_tongues,
      pref_acceptable_incomes, pref_locations
    ) VALUES (
      ${profile.id}, 25, 35,
      ${JSON.stringify(['Never Married'])}::jsonb, ${JSON.stringify(['Hindu'])}::jsonb,
      ${JSON.stringify([])}::jsonb, ${JSON.stringify([])}::jsonb,
      ${JSON.stringify([])}::jsonb, ${JSON.stringify([])}::jsonb
    )
  `;
  await dbi`
    INSERT INTO user_settings (user_id, photo_blur)
    VALUES (${user.id}, 'never')
  `;

  const photoId = randomUUID();
  const s3Key = `profiles/${user.id}/photos/${photoId}.jpeg`;
  await dbi`
    INSERT INTO profile_photos (id, profile_id, s3_key, is_primary, display_order, status)
    VALUES (
      ${photoId}, ${profile.id}, ${s3Key}, true, 0,
      ${opts?.pendingReview ? 'pending' : 'approved'}
    )
  `;

  await dbi`
    INSERT INTO verifications (profile_id, method, status, selfie_s3_key)
    VALUES (
      ${profile.id}, 'selfie',
      ${opts?.pendingReview ? 'pending' : 'verified'},
      ${`verifications/${user.id}/selfie-${randomUUID()}.jpeg`}
    )
  `;

  return {
    user: user as { id: string; phone: string; role: string },
    profileId: profile.id as string,
    photoId,
    s3Key,
  };
}

export async function seedLoginMember() {
  await cleanupAuthFixtures();
  const member = await seedCompleteMember(MEMBER_PHONE, MEMBER_NAME, { pendingReview: false });
  await seedOtp(MEMBER_PHONE);
  return member;
}

export async function seedPendingReviewMember() {
  // Keep login member if present; only (re)seed pending review user.
  const dbi = db();
  await dbi`DELETE FROM users WHERE phone = ${PENDING_PHONE}`;
  const pending = await seedCompleteMember(PENDING_PHONE, PENDING_NAME, { pendingReview: true });
  return pending;
}

export async function getVerificationStatus(profileId: string) {
  const dbi = db();
  const [row] = await dbi`SELECT status, rejection_reason, reviewed_by, reviewed_at FROM verifications WHERE profile_id = ${profileId}`;
  return row as { status: string; rejection_reason: string | null; reviewed_by: string | null; reviewed_at: Date | null } | undefined;
}

export async function getPhotoStatuses(profileId: string) {
  const dbi = db();
  return dbi`SELECT id, status FROM profile_photos WHERE profile_id = ${profileId}` as Promise<
    Array<{ id: string; status: string }>
  >;
}
