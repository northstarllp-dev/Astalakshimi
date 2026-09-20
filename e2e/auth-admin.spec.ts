/**
 * Member login (OTP), registration step-1, and admin profile review.
 *
 * OTP send is stubbed at the network layer; a known otp_attempts row is seeded
 * so verify still exercises the real API + Postgres.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  E2E_OTP,
  MEMBER_NAME,
  MEMBER_PHONE,
  PENDING_NAME,
  cleanupAuthFixtures,
  closeAuthFixtures,
  ensureAdminUser,
  getPhotoStatuses,
  getVerificationStatus,
  seedLoginMember,
  seedOtp,
  seedPendingReviewMember,
} from './helpers/auth-fixtures';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

async function stubSendOtp(page: Page) {
  await page.route('**/api/proxy/auth/send-otp', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'OTP sent successfully (e2e stub)' }),
    });
  });
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await ensureAdminUser();
  await seedLoginMember();
});

test.afterAll(async () => {
  await cleanupAuthFixtures();
  await closeAuthFixtures();
});

test.describe('member login', () => {
  test('login page validates phone and completes OTP login to /home', async ({ page }) => {
    await seedOtp(MEMBER_PHONE);
    await stubSendOtp(page);

    await page.goto('/login');
    await expect(page.getByLabel(/mobile number/i)).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(/mobile number/i).fill(MEMBER_PHONE);
    await page.getByRole('button', { name: /send otp/i }).click();

    const otpInput = page.getByRole('textbox', { name: /one-time password/i });
    await expect(otpInput).toBeVisible({ timeout: 15_000 });
    await otpInput.fill(E2E_OTP);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
  });

  test('unregistered phone on login is sent to register', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/mobile number/i).fill('9100000099');
    await page.getByRole('button', { name: /send otp/i }).click();
    await expect(page).toHaveURL(/register/, { timeout: 20_000 });
  });
});

test.describe('registration', () => {
  test('register step 1 collects profile-for, phone, and terms', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/register/);
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /myself/i }).click();
    const phoneInput = page.getByLabel(/mobile|phone/i).or(page.locator('input[name="phone"]')).first();
    await phoneInput.fill('9100000088');

    // Without terms, continue should stay on step 1 (or show validation).
    const continueBtn = page.getByRole('button', { name: /continue/i }).first();
    await continueBtn.click();
    await expect(page).toHaveURL(/register/);

    const terms = page.getByRole('checkbox').first();
    if (await terms.isVisible().catch(() => false)) {
      await terms.check();
    }
    // With stubbed OTP we can advance past phone step without SMS.
    await stubSendOtp(page);
    await seedOtp('9100000088');
    await continueBtn.click();
    // OTP step or next profile step — leave the create-account heading behind.
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeHidden({
      timeout: 20_000,
    });
  });
});

async function adminSignIn(page: Page) {
  test.setTimeout(90_000);
  await page.context().clearCookies();
  await page.goto('/admin/login', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    try {
      localStorage.removeItem('astalakshimi.admin.session');
      sessionStorage.removeItem('astalakshimi.admin.session');
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /staff sign in/i })).toBeVisible({
    timeout: 15_000,
  });

  const email = page.getByLabel(/work email|email/i);
  const password = page.getByLabel(/^password$/i);
  await email.fill(ADMIN_EMAIL);
  await password.fill(ADMIN_PASSWORD);
  await expect(email).toHaveValue(ADMIN_EMAIL);
  await expect(password).toHaveValue(ADMIN_PASSWORD);

  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/api/auth/admin-login') && res.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: /^sign in$/i }).click();
  const res = await loginResponse;
  expect(res.ok(), `admin-login HTTP ${res.status()}`).toBeTruthy();

  await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 30_000 });
}

async function openAdminProfile(page: Page, profileId: string) {
  const url = `/admin/profiles/${profileId}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch (err) {
    // Client redirects (AdminGate) can abort the first navigation; retry once.
    const message = err instanceof Error ? err.message : String(err);
    if (!/ERR_ABORTED|interrupted/i.test(message)) throw err;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  }
}

test.describe('admin profile review', () => {
  test('admin signs in and approves a pending profile (DB + photos)', async ({ page }) => {
    const pending = await seedPendingReviewMember();
    const before = await getVerificationStatus(pending.profileId);
    expect(before?.status).toBe('pending');

    await adminSignIn(page);
    await openAdminProfile(page, pending.profileId);
    await expect(page.getByRole('heading', { name: PENDING_NAME })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/pending/i).first()).toBeVisible();

    const approveResponse = page.waitForResponse(
      (res) =>
        res.url().includes(`/admin/verifications/${pending.profileId}`) &&
        res.request().method() === 'PATCH',
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /approve profile/i }).click();
    const approveRes = await approveResponse;
    expect(approveRes.ok(), `approve HTTP ${approveRes.status()}: ${await approveRes.text()}`).toBeTruthy();
    // Must leave the detail URL — `/admin/profiles/:id` also matches a naive `/admin/profiles/` check.
    await expect(page).toHaveURL(/\/admin\/profiles\/?(?:\?|$)/, { timeout: 30_000 });

    const after = await getVerificationStatus(pending.profileId);
    expect(after?.status).toBe('verified');
    expect(after?.reviewed_by).toBeTruthy();
    expect(after?.reviewed_at).toBeTruthy();

    const photos = await getPhotoStatuses(pending.profileId);
    expect(photos.length).toBeGreaterThan(0);
    expect(photos.every((p) => p.status === 'approved')).toBe(true);
  });

  test('admin can reject a pending profile with a reason', async ({ page }) => {
    const pending = await seedPendingReviewMember();

    await adminSignIn(page);
    await openAdminProfile(page, pending.profileId);
    await expect(page.getByRole('heading', { name: PENDING_NAME })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /^reject$/i }).click();
    await page.getByLabel(/reason/i).fill('E2E rejection — documents unclear');

    const rejectResponse = page.waitForResponse(
      (res) =>
        res.url().includes(`/admin/verifications/${pending.profileId}`) &&
        res.request().method() === 'PATCH',
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /confirm reject|reject profile|submit/i }).click();
    const rejectRes = await rejectResponse;
    expect(rejectRes.ok(), `reject HTTP ${rejectRes.status()}: ${await rejectRes.text()}`).toBeTruthy();
    await expect(page).toHaveURL(/\/admin\/profiles\/?(?:\?|$)/, { timeout: 30_000 });

    const after = await getVerificationStatus(pending.profileId);
    expect(after?.status).toBe('rejected');
    expect(after?.rejection_reason).toMatch(/E2E rejection/);
  });
});
