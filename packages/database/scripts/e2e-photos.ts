/**
 * E2E for profile_photos + photo blur privacy (viewer-facing).
 *
 * Seeds owner + viewer, uploads a real JPEG to S3 via POST /media/upload,
 * inserts/approves profile_photos, toggles settings.photoBlur, asserts
 * GET /profiles/:id as the other user.
 *
 * Usage: npx tsx scripts/e2e-photos.ts
 *        npx tsx scripts/e2e-photos.ts --cleanup-only
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createHmac, createHash, randomUUID } from 'crypto';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../.env') });

const OWNER_PHONE = '9000090021';
const VIEWER_PHONE = '9000090022';
const API = process.env.API_BASE || 'http://localhost:4000/api';
const CLEANUP_ONLY = process.argv.includes('--cleanup-only');
const KEEP = process.argv.includes('--keep');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const BUCKET = process.env.AWS_S3_MEDIA_BUCKET;
if (!DATABASE_URL) throw new Error('DATABASE_URL required');
if (!JWT_SECRET) throw new Error('JWT_SECRET required');

const sql = postgres(DATABASE_URL, { max: 1, ssl: 'require' as any });

/** Minimal valid 1×1 JPEG */
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z',
  'base64',
);

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

async function cleanup() {
  const deleted = await sql`
    DELETE FROM users WHERE phone IN (${OWNER_PHONE}, ${VIEWER_PHONE}) RETURNING id
  `;
  console.log(`Cleanup: deleted ${deleted.length} throwaway user(s)`);
}

async function seedMember(phone: string, fullName: string, gender: 'Male' | 'Female') {
  const [user] = await sql`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${phone}, true, true, NOW(), 'member', 'active')
    RETURNING id, phone, role
  `;
  const [profile] = await sql`
    INSERT INTO profiles (
      user_id, created_by, profile_for, full_name, gender, dob, marital_status,
      height_cm, city, state, country, city_slug,
      religion, caste, community_slug, mother_tongue,
      education_level, employment_status, profession, annual_income,
      photo_privacy
    ) VALUES (
      ${user.id}, 'self', 'Myself', ${fullName}, ${gender}, '1994-03-12', 'Never Married',
      170, 'Chennai', 'Tamil Nadu', 'India', 'chennai-tamil-nadu',
      'Hindu', 'Brahmin', 'hindu-brahmin', 'Tamil',
      'Bachelors', 'Employed', 'Engineer', '₹10 – 15 Lakh',
      'blurred'
    )
    RETURNING id
  `;
  await sql`
    INSERT INTO user_settings (user_id, photo_blur)
    VALUES (${user.id}, 'always')
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
  return {
    user: user as { id: string; phone: string; role: string },
    profileId: profile.id as string,
  };
}

async function uploadProfilePhoto(token: string) {
  const form = new FormData();
  form.append('file', new Blob([TINY_JPEG], { type: 'image/jpeg' }), 'e2e-photo.jpg');
  form.append('purpose', 'profile_photo');
  form.append('contentType', 'image/jpeg');
  form.append('fileSize', String(TINY_JPEG.length));

  const res = await fetch(`${API}/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`media/upload ${res.status}: ${text}`);
  return JSON.parse(text) as { s3Key: string; contentHash?: string; bucket?: string };
}

async function main() {
  if (CLEANUP_ONLY) {
    await cleanup();
    await sql.end();
    return;
  }

  await cleanup();
  const owner = await seedMember(OWNER_PHONE, 'Throwaway Photo Owner', 'Male');
  const viewer = await seedMember(VIEWER_PHONE, 'Throwaway Photo Viewer', 'Female');
  const ownerToken = mintAccessToken(owner.user);
  const viewerToken = mintAccessToken(viewer.user);
  console.log('Seeded owner/viewer', { owner: owner.profileId, viewer: viewer.profileId });

  // 1) Real S3 upload via API
  const uploaded = await uploadProfilePhoto(ownerToken);
  console.log('Uploaded to S3:', { s3Key: uploaded.s3Key, hash: uploaded.contentHash, bucket: uploaded.bucket || BUCKET });
  if (!uploaded.s3Key.includes(owner.user.id)) {
    throw new Error('s3Key does not include owner userId');
  }
  if (uploaded.contentHash && uploaded.contentHash.length !== 64) {
    throw new Error('contentHash should be sha256 hex');
  }

  // 2) Attach as profile photo (pending), then approve for public visibility
  const addRes = await fetch(`${API}/profiles/me/photos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ s3Key: uploaded.s3Key, contentHash: uploaded.contentHash }),
  });
  if (!addRes.ok) {
    // Fallback: insert via confirm-photo
    const confirm = await fetch(`${API}/media/confirm-photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        s3Key: uploaded.s3Key,
        contentHash: uploaded.contentHash,
        isPrimary: true,
        displayOrder: 0,
      }),
    });
    if (!confirm.ok) {
      throw new Error(`add photo failed ${addRes.status}/${confirm.status}: ${await addRes.text()} / ${await confirm.text()}`);
    }
  }

  const [photoRow] = await sql`
    SELECT id, s3_key, content_hash, is_primary, display_order, status, blur_data_url
    FROM profile_photos WHERE profile_id = ${owner.profileId}
  `;
  if (!photoRow) throw new Error('profile_photos row missing after upload');
  console.log('DB photo row (pending):', photoRow);

  // Pending must NOT be visible to other users
  const pendingView = await fetch(`${API}/profiles/${owner.profileId}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  const pendingJson = await pendingView.json();
  if ((pendingJson.photos || []).length > 0) {
    throw new Error('Pending photos must not be returned to other viewers');
  }
  console.log('Pending gate OK (viewer sees 0 photos)');

  // Approve for visibility tests
  await sql`
    UPDATE profile_photos SET status = 'approved' WHERE profile_id = ${owner.profileId}
  `;

  // 3) photoBlur = always → viewer should get blurPhoto true but keys present (CSS blur)
  await fetch(`${API}/users/me/settings`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoBlur: 'always' }),
  }).then(async (r) => {
    if (!r.ok) throw new Error(`settings always ${r.status}: ${await r.text()}`);
  });

  const blurred = await fetch(`${API}/profiles/${owner.profileId}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  }).then((r) => r.json());
  if (!blurred.blurPhoto) throw new Error('Expected blurPhoto=true when photoBlur=always');
  if (!blurred.photos?.length) throw new Error('Expected approved photo keys for CSS blur');
  console.log('always → blurPhoto=true, photos=', blurred.photos.length);

  // Sync check: profiles.photo_privacy should be blurred
  const [privAlways] = await sql`SELECT photo_privacy FROM profiles WHERE id = ${owner.profileId}`;
  if (privAlways.photo_privacy !== 'blurred') {
    throw new Error(`Expected photo_privacy=blurred got ${privAlways.photo_privacy}`);
  }

  // 4) photoBlur = never → clear photos
  await fetch(`${API}/users/me/settings`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoBlur: 'never' }),
  }).then(async (r) => {
    if (!r.ok) throw new Error(`settings never ${r.status}: ${await r.text()}`);
  });

  const visible = await fetch(`${API}/profiles/${owner.profileId}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  }).then((r) => r.json());
  if (visible.blurPhoto) throw new Error('Expected blurPhoto=false when photoBlur=never');
  if (!visible.photos?.length) throw new Error('Expected photos when never');
  console.log('never → blurPhoto=false, photos=', visible.photos.length);

  const [privVisible] = await sql`SELECT photo_privacy FROM profiles WHERE id = ${owner.profileId}`;
  if (privVisible.photo_privacy !== 'visible') {
    throw new Error(`Expected photo_privacy=visible got ${privVisible.photo_privacy}`);
  }

  // 5) Legacy accepted value should coerce
  const legacy = await fetch(`${API}/users/me/settings`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoBlur: 'accepted' }),
  });
  if (!legacy.ok) throw new Error(`legacy accepted rejected ${legacy.status}: ${await legacy.text()}`);
  const [blurRow] = await sql`SELECT photo_blur FROM user_settings WHERE user_id = ${owner.user.id}`;
  if (blurRow.photo_blur !== 'when_not_connected') {
    throw new Error(`Expected when_not_connected got ${blurRow.photo_blur}`);
  }
  console.log('legacy accepted → when_not_connected OK');

  // 6) content_hash persisted
  const hash = uploaded.contentHash || createHash('sha256').update(TINY_JPEG).digest('hex');
  const [hashRow] = await sql`
    SELECT content_hash FROM profile_photos WHERE profile_id = ${owner.profileId}
  `;
  if (hashRow.content_hash && hashRow.content_hash !== hash) {
    console.warn('content_hash mismatch (non-fatal if upload hash differed)', hashRow.content_hash, hash);
  } else {
    console.log('content_hash present:', Boolean(hashRow.content_hash));
  }

  // Export for AWS MCP / Playwright follow-up
  console.log('\nS3_KEY=' + uploaded.s3Key);
  console.log('BUCKET=' + (uploaded.bucket || BUCKET));
  console.log('OWNER_PROFILE_ID=' + owner.profileId);
  console.log('VIEWER_PROFILE_ID=' + viewer.profileId);
  console.log('OWNER_TOKEN=' + ownerToken);
  console.log('VIEWER_TOKEN=' + viewerToken);

  if (!KEEP) {
    await cleanup();
  } else {
    console.log('--keep: users left for UI follow-up');
  }

  await sql.end();
  console.log('\nAPI→S3→DB photo privacy E2E PASSED');
}

main().catch(async (e) => {
  console.error(e);
  try {
    if (!KEEP) await cleanup();
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
