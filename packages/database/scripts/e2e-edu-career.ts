/**
 * Throwaway-user E2E for flat education/career fields.
 *
 * Usage:
 *   npx tsx scripts/e2e-edu-career.ts          # seed → PATCH → assert → cleanup
 *   npx tsx scripts/e2e-edu-career.ts --keep   # leave user for UI follow-up (prints token)
 *   npx tsx scripts/e2e-edu-career.ts --cleanup-only
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createHmac } from 'crypto';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../.env') });

const PHONE = '9000090009'; // throwaway — never a real member
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

  const [profile] = await sql`
    INSERT INTO profiles (
      user_id, created_by, profile_for, full_name, gender, dob, marital_status,
      height_cm, city, state, country, city_slug,
      religion, caste, community_slug, mother_tongue,
      education_level, degree, college_name, employment_status, profession, company_name, company_sector, annual_income,
      photo_privacy
    ) VALUES (
      ${user.id}, 'self', 'Myself', 'E2E Throwaway User', 'Male', '1995-06-15', 'Never Married',
      175, 'Chennai', 'Tamil Nadu', 'India', 'chennai-tamil-nadu',
      'Hindu', 'Brahmin', 'hindu-brahmin', 'Tamil',
      'Bachelors', 'B.Tech', 'IIT Madras', 'Employed', 'Software Engineer', 'Acme Corp', 'Private', '₹10 – 15 Lakh',
      'blurred'
    )
    RETURNING id
  `;

  console.log('Seeded throwaway user', { userId: user.id, profileId: profile.id, phone: PHONE });
  return user as { id: string; phone: string; role: string };
}

async function assertDb(userId: string, expected: Record<string, string | null>) {
  const [row] = await sql`
    SELECT education_level, degree, college_name, employment_status, profession, company_name, company_sector
    FROM profiles WHERE user_id = ${userId}
  `;
  if (!row) throw new Error('Profile row missing after PATCH');

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

  const user = await seed();
  const token = mintAccessToken(user);
  console.log('Minted JWT (first 24 chars):', token.slice(0, 24) + '…');

  const patchBody = {
    educationLevel: 'Masters',
    degree: 'M.Tech Computer Science',
    collegeName: 'Anna University',
    employmentStatus: 'Business Owner',
    profession: 'Founder',
    companyName: 'Throwaway Labs',
    companySector: 'Startup',
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

  // Fresh GET after commit (avoid relying solely on PATCH response body)
  const getRes = await fetch(`${API}/profiles/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await getRes.json();
  const p = body.profile;
  console.log('GET /profiles/me education/career:', {
    educationLevel: p.educationLevel,
    degree: p.degree,
    collegeName: p.collegeName,
    employmentStatus: p.employmentStatus,
    profession: p.profession,
    companyName: p.companyName,
    companySector: p.companySector,
  });

  if (
    p.educationLevel !== 'Masters' ||
    p.degree !== 'M.Tech Computer Science' ||
    p.employmentStatus !== 'Business Owner' ||
    p.profession !== 'Founder'
  ) {
    throw new Error('GET after PATCH did not reflect written values');
  }

  // Confirm no FK fields leaked back
  if ('educationId' in p || 'occupationId' in p || 'companyId' in p || 'specializationId' in p) {
    throw new Error('API still returning deleted FK fields');
  }

  await assertDb(user.id, {
    education_level: 'Masters',
    degree: 'M.Tech Computer Science',
    college_name: 'Anna University',
    employment_status: 'Business Owner',
    profession: 'Founder',
    company_name: 'Throwaway Labs',
    company_sector: 'Startup',
  });

  // Clear optional free-text fields → NULL in DB (must send null, not "")
  const clearRes = await fetch(`${API}/profiles/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      degree: null,
      collegeName: null,
      profession: null,
      companyName: null,
    }),
  });
  if (!clearRes.ok) {
    throw new Error(`Clear PATCH failed ${clearRes.status}: ${await clearRes.text()}`);
  }
  await assertDb(user.id, {
    education_level: 'Masters',
    degree: null,
    college_name: null,
    employment_status: 'Business Owner',
    profession: null,
    company_name: null,
    company_sector: 'Startup',
  });
  console.log('Clear → NULL assertion OK');

  if (KEEP) {
    // Re-seed career values so the UI has something to edit
    await sql`
      UPDATE profiles SET
        education_level = 'Bachelors',
        degree = 'B.Tech',
        college_name = 'IIT Madras',
        employment_status = 'Employed',
        profession = 'Software Engineer',
        company_name = 'Acme Corp',
        company_sector = 'Private'
      WHERE user_id = ${user.id}
    `;
    console.log('\n--keep mode: user left in DB for UI follow-up');
    console.log('TOKEN=' + token);
    console.log('USER_ID=' + user.id);
    console.log('PHONE=' + PHONE);
  } else {
    await cleanup();
  }

  await sql.end();
  console.log('\nAPI→DB E2E PASSED');
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
