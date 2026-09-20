/**
 * Playwright UI → API → RDS E2E for horoscope fields.
 *
 * Seeds (or reuses) throwaway phone 9000090011, mints JWT from JWT_SECRET,
 * edits #horoscope in the browser, asserts GET + RDS.
 *
 * Prerequisites: API on :4000, web on :3000
 * Usage: npx tsx scripts/e2e-horoscope-ui.ts
 */
import { createRequire } from 'module';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createHmac } from 'crypto';
import postgres from 'postgres';

const require = createRequire(resolve(__dirname, '../../../package.json'));
const { chromium } = require('@playwright/test') as typeof import('@playwright/test');

config({ path: resolve(__dirname, '../../../.env') });

const PHONE = '9000090011';
const WEB = process.env.WEB_BASE || 'http://localhost:3000';
const API = process.env.API_BASE || 'http://localhost:4000/api';
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

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

async function ensureUser() {
  const [user] = await sql`
    SELECT id, phone, role FROM users WHERE phone = ${PHONE} LIMIT 1
  `;
  if (!user) {
    throw new Error(`Throwaway user ${PHONE} missing — run: npx tsx scripts/e2e-horoscope.ts --keep`);
  }
  const [profile] = await sql`
    SELECT id FROM profiles WHERE user_id = ${user.id} LIMIT 1
  `;
  if (!profile) throw new Error('Throwaway profile missing');

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
    WHERE profile_id = ${profile.id}
  `;

  return {
    user: user as { id: string; phone: string; role: string },
    profileId: profile.id as string,
  };
}

async function selectInHoroscope(page: any, currentButton: RegExp, optionText: string) {
  const section = page.locator('#horoscope');
  await section.getByRole('button', { name: currentButton }).first().click();
  await page.waitForTimeout(400);
  const search = page.getByPlaceholder(/Search/i).last();
  if (await search.isVisible().catch(() => false)) {
    await search.fill(optionText);
    await page.waitForTimeout(200);
  }
  // cmdk CommandItem — prefer exact text click inside the open listbox/popover
  const opt = page.getByRole('option', { name: optionText }).first();
  if (await opt.isVisible().catch(() => false)) {
    await opt.click();
  } else {
    await page.locator('[cmdk-item]').filter({ hasText: new RegExp('^' + optionText + '$') }).first().click();
  }
  await page.waitForTimeout(200);
}

async function main() {
  const { user, profileId } = await ensureUser();
  const token = mintAccessToken(user);
  console.log('Using throwaway', { userId: user.id, profileId });

  const me = await fetch(`${API}/profiles/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!me.ok) throw new Error(`API profiles/me ${me.status}: ${await me.text()}`);
  const meJson = await me.json();
  console.log('API hydrate check:', meJson.profile?.fullName, meJson.horoscope?.nakshatra);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([
    { name: 'astalakshimi.auth_token', value: token, domain: 'localhost', path: '/' },
    { name: 'astalakshimi.has_profile', value: '1', domain: 'localhost', path: '/' },
  ]);
  const page = await context.newPage();

  await page.goto(WEB);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('is_authenticated', 'true');
  });

  await page.goto(`${WEB}/profile/edit#horoscope`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const fullName = await page.locator('input').nth(0).inputValue();
  console.log('Form fullName after hydrate:', fullName);
  if (!fullName || fullName.length < 3) {
    throw new Error('Profile did not hydrate from API (need is_authenticated + auth cookie)');
  }

  await page.locator('#horoscope').scrollIntoViewIfNeeded();

  await selectInHoroscope(page, /Ashwini|Select star|Rohini|Bharani/, 'Rohini');
  await selectInHoroscope(page, /Mesha|Select rashi|Vrishabha|Aries|Taurus/, 'Taurus (Vrishabha)');
  // Current manglik after hydrate is "No"
  await selectInHoroscope(page, /^No$/, 'Yes');

  await page.getByPlaceholder('08:30').fill('11:15');
  await page.getByPlaceholder('e.g. Chennai, TN').fill('Coimbatore');
  await page.keyboard.press('Escape');

  page.once('dialog', async (d) => {
    console.log('Alert:', d.message());
    await d.accept();
  });

  const [patchRes] = await Promise.all([
    page
      .waitForResponse(
        (r) => r.url().includes('/profiles/me') && r.request().method() === 'PATCH',
        { timeout: 20000 },
      )
      .catch(() => null),
    page.getByRole('button', { name: 'Save changes' }).click(),
  ]);
  if (patchRes) {
    console.log('PATCH status:', patchRes.status());
    if (!patchRes.ok()) {
      console.log('PATCH body:', await patchRes.text());
    }
  }
  await page.waitForTimeout(2000);

  const after = await fetch(`${API}/profiles/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const afterJson = await after.json();
  const h = afterJson.horoscope;
  console.log('GET after UI save:', {
    birthTime: h?.birthTime,
    birthPlace: h?.birthPlace,
    manglik: h?.manglik,
    rashi: h?.rashi,
    nakshatra: h?.nakshatra,
  });

  const expect = {
    birthTime: '11:15 AM',
    birthPlace: 'Coimbatore',
    manglik: 'Yes',
    rashi: 'Vrishabha',
    nakshatra: 'Rohini',
  };
  for (const [k, v] of Object.entries(expect)) {
    if (h?.[k] !== v) throw new Error(`API mismatch ${k}: want ${v} got ${h?.[k]}`);
  }

  const [row] = await sql`
    SELECT birth_time, birth_place, manglik, rashi, nakshatra
    FROM horoscopes WHERE profile_id = ${profileId}
  `;
  console.log('RDS row:', row);
  if (
    row.birth_time !== '11:15 AM' ||
    row.birth_place !== 'Coimbatore' ||
    row.manglik !== 'Yes' ||
    row.rashi !== 'Vrishabha' ||
    row.nakshatra !== 'Rohini'
  ) {
    throw new Error(`RDS mismatch: ${JSON.stringify(row)}`);
  }

  // Public-by-id read (auth required by API): own viewer sees full horoscope attrs.
  const publicRes = await fetch(`${API}/profiles/${profileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!publicRes.ok) {
    throw new Error(`GET /profiles/:id failed ${publicRes.status}: ${await publicRes.text()}`);
  }
  const publicJson = await publicRes.json();
  const ph = publicJson.horoscope;
  if (ph?.nakshatra !== 'Rohini' || ph?.rashi !== 'Vrishabha' || ph?.birthPlace !== 'Coimbatore') {
    throw new Error(`Profile-by-id missing astrology attrs: ${JSON.stringify(ph)}`);
  }
  console.log('Profile-by-id astrology attrs OK');

  await browser.close();

  const deleted = await sql`DELETE FROM users WHERE phone = ${PHONE} RETURNING id`;
  console.log(`Cleanup: deleted ${deleted.length} throwaway user(s)`);

  await sql.end();
  console.log('\nUI→API→RDS horoscope E2E PASSED');
}

main().catch(async (e) => {
  console.error(e);
  try {
    await sql.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
