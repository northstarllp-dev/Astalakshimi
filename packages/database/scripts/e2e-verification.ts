/**
 * Throwaway-user E2E for the admin verification-approval flow.
 *
 * Verifies: reject writes reviewed_by/reviewed_at + reason; verify clears the
 * reason; admin GET exposes those fields; member resubmit (confirm-verification)
 * resets review fields to NULL.
 *
 * Usage:
 *   npx tsx scripts/e2e-verification.ts          # seed → admin reject/verify → resubmit → cleanup
 *   npx tsx scripts/e2e-verification.ts --keep   # leave users for UI follow-up (prints tokens)
 *   npx tsx scripts/e2e-verification.ts --cleanup-only
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createHmac, randomUUID } from 'crypto';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../.env') });

const PHONE_MEMBER = '9000090066'; // throwaway member
const PHONE_STAFF = '9000090067'; // throwaway staff admin
const API = process.env.API_BASE || 'http://localhost:4000/api';
const KEEP = process.argv.includes('--keep');
const CLEANUP_ONLY = process.argv.includes('--cleanup-only');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!JWT_SECRET) throw new Error('JWT_SECRET is not set');

const sql = postgres(DATABASE_URL, { max: 1, ssl: 'require' as any });

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
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
  // Drop profiles first (cascades to verifications/photos/etc.) so the staff
  // user — referenced by verifications.reviewed_by — can be deleted.
  await sql`DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE phone IN (${PHONE_MEMBER}, ${PHONE_STAFF}))`.catch(() => {});
  const deleted = await sql`DELETE FROM users WHERE phone IN (${PHONE_MEMBER}, ${PHONE_STAFF}) RETURNING id`;
  console.log(`Cleanup: deleted ${deleted.length} throwaway user(s)`);
}

async function seed() {
  await cleanup();

  const [member] = await sql`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${PHONE_MEMBER}, true, true, NOW(), 'member', 'active')
    RETURNING id, phone, role
  `;
  const [staff] = await sql`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${PHONE_STAFF}, true, true, NOW(), 'admin', 'active')
    RETURNING id, phone, role
  `;

  const [profile] = await sql`
    INSERT INTO profiles (
      user_id, created_by, profile_for, full_name, gender, dob, marital_status,
      height_cm, city, state, country, city_slug,
      religion, caste, community_slug, mother_tongue,
      education_level, degree, employment_status, profession, annual_income,
      photo_privacy
    ) VALUES (
      ${member.id}, 'self', 'Myself', 'Throwaway Verify User', 'Male', '1995-06-15', 'Never Married',
      175, 'Chennai', 'Tamil Nadu', 'India', 'chennai-tamil-nadu',
      'Hindu', 'Brahmin', 'hindu-brahmin', 'Tamil',
      'Bachelors', 'B.Tech', 'Employed', 'Software Engineer', '₹10 – 15 Lakh',
      'blurred'
    )
    RETURNING id
  `;

  await sql`INSERT INTO family_details (profile_id, brothers_count, sisters_count) VALUES (${profile.id}, 0, 0)`;
  await sql`INSERT INTO lifestyle_interests (profile_id, diet, smoking, alcohol, interests) VALUES (${profile.id}, 'Vegetarian', NULL, NULL, '[]'::jsonb)`;
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
  // Pending verification awaiting staff review.
  await sql`
    INSERT INTO verifications (profile_id, method, status)
    VALUES (${profile.id}, 'selfie', 'pending')
  `;

  console.log('Seeded throwaway users', {
    memberId: member.id, staffId: staff.id, profileId: profile.id,
  });
  return {
    member: member as { id: string; phone: string; role: string },
    staff: staff as { id: string; phone: string; role: string },
    profileId: profile.id as string,
  };
}

async function assertVerification(
  profileId: string,
  expected: { status: string; rejectionReason: string | null; reviewedBy: string | null; reviewedAtNotNull: boolean },
) {
  const [row] = await sql`
    SELECT status, rejection_reason, reviewed_by, reviewed_at
    FROM verifications WHERE profile_id = ${profileId}
  `;
  if (!row) throw new Error('verifications row missing');
  const mismatches: string[] = [];
  if (row.status !== expected.status) mismatches.push(`status: want=${expected.status} got=${row.status}`);
  if ((row.rejection_reason ?? null) !== expected.rejectionReason) {
    mismatches.push(`rejection_reason: want=${JSON.stringify(expected.rejectionReason)} got=${JSON.stringify(row.rejection_reason)}`);
  }
  if ((row.reviewed_by ?? null) !== expected.reviewedBy) {
    mismatches.push(`reviewed_by: want=${JSON.stringify(expected.reviewedBy)} got=${JSON.stringify(row.reviewed_by)}`);
  }
  const reviewedAtOk = expected.reviewedAtNotNull ? row.reviewed_at != null : row.reviewed_at == null;
  if (!reviewedAtOk) {
    mismatches.push(`reviewed_at: wantNotNull=${expected.reviewedAtNotNull} got=${JSON.stringify(row.reviewed_at)}`);
  }
  if (mismatches.length) throw new Error(`DB assertion failed:\n  ${mismatches.join('\n  ')}`);
  console.log('DB assertion OK:', row);
}

async function adminPatch(token: string, profileId: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}/admin/verifications/${profileId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PATCH /admin/verifications/${profileId} failed ${res.status}: ${text}`);
  return res.status;
}

async function main() {
  if (CLEANUP_ONLY) {
    await cleanup();
    await sql.end();
    return;
  }

  const { member, staff, profileId } = await seed();
  const staffToken = mintAccessToken(staff);
  console.log('Staff JWT (first 24):', staffToken.slice(0, 24) + '…');

  // 1. Staff REJECTS with a reason → reviewed_by/reviewed_at written, reason stored.
  await adminPatch(staffToken, profileId, { status: 'rejected', rejectionReason: 'Selfie is blurry' });
  await assertVerification(profileId, {
    status: 'rejected',
    rejectionReason: 'Selfie is blurry',
    reviewedBy: staff.id,
    reviewedAtNotNull: true,
  });

  // Admin GET exposes the review fields.
  const adminGet = await fetch(`${API}/admin/profiles/${profileId}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const adminBody = await adminGet.json();
  if (adminBody.verificationStatus !== 'rejected' || adminBody.rejectionReason !== 'Selfie is blurry') {
    throw new Error(`Admin GET did not reflect rejected state: ${JSON.stringify(adminBody)}`);
  }
  if (adminBody.reviewedBy !== staff.id || !adminBody.reviewedAt) {
    throw new Error(`Admin GET did not expose reviewed_by/reviewed_at: ${JSON.stringify({ reviewedBy: adminBody.reviewedBy, reviewedAt: adminBody.reviewedAt })}`);
  }
  console.log('Admin GET OK (rejected, reviewedBy/reviewedAt exposed).');

  // 2. Staff VERIFIES → rejection_reason cleared to NULL, reviewed_by/reviewed_at refreshed.
  await adminPatch(staffToken, profileId, { status: 'verified' });
  await assertVerification(profileId, {
    status: 'verified',
    rejectionReason: null,
    reviewedBy: staff.id,
    reviewedAtNotNull: true,
  });

  // 3. Member resubmits (confirm-verification) → review fields reset to NULL, status pending.
  const memberToken = mintAccessToken(member);
  const selfieKey = `verifications/${member.id}/selfie-${randomUUID()}.jpeg`;
  const resubmitRes = await fetch(`${API}/media/confirm-verification`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${memberToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'selfie', selfieS3Key: selfieKey }),
  });
  const resubmitText = await resubmitRes.text();
  if (!resubmitRes.ok) {
    throw new Error(`POST /media/confirm-verification failed ${resubmitRes.status}: ${resubmitText}`);
  }
  await assertVerification(profileId, {
    status: 'pending',
    rejectionReason: null,
    reviewedBy: null,
    reviewedAtNotNull: false,
  });

  if (KEEP) {
    // Re-verify for UI follow-up.
    await adminPatch(staffToken, profileId, { status: 'verified' });
    console.log('\n--keep mode: users left in DB for UI follow-up');
    console.log('STAFF_TOKEN=' + staffToken);
    console.log('MEMBER_TOKEN=' + memberToken);
    console.log('STAFF_ID=' + staff.id);
    console.log('MEMBER_ID=' + member.id);
    console.log('PROFILE_ID=' + profileId);
    console.log('STAFF_PHONE=' + PHONE_STAFF);
    console.log('MEMBER_PHONE=' + PHONE_MEMBER);
  } else {
    await cleanup();
  }

  await sql.end();
  console.log('\nAdmin verification-approval E2E PASSED');
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); } catch { /* ignore */ }
  try { await sql.end(); } catch { /* ignore */ }
  process.exit(1);
});
