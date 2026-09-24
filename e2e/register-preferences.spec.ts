/**
 * Partner preferences at registration — real user flow over the live dev stack.
 *
 * The wizard's step 5 collects partner preferences. This spec covers:
 *
 *   1. The step opens with the "same as me" pre-fill taken from the community
 *      step (religion / community / mother tongue / city), so the member confirms
 *      rather than fills from scratch.
 *   2. Edge cases: a cleared age, an inverted age range and an empty religion
 *      list all block Continue with a visible message.
 *   3. Editing persists the member's real choices into the signup draft.
 *   4. Registering with those choices stores them (not the old fabricated
 *      defaults) and the match engine honours them — a candidate that only
 *      satisfies the *old* defaults is filtered out.
 *
 * OTP and S3 photo upload need external providers, so — like
 * e2e/matches.spec.ts — the browser is authenticated with a locally-minted JWT
 * cookie and the wizard resumes from a seeded draft at step 5.
 */
import { test, expect } from '@playwright/test';
import {
  seedRegisterFixtures,
  cleanupRegisterFixtures,
  closeRegisterFixtures,
  completeDraftData,
  CHOSEN_PREFS,
  REGISTRANT_NAME,
  REGISTRANT_PHONE,
  type RegisterFixtures,
} from './helpers/register-fixtures';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

let fx: RegisterFixtures;

/** Steps 1-4 complete → loadSignupDraft() infers step 5 (preferences). */
function signupDraft() {
  return {
    step: 5,
    data: completeDraftData(REGISTRANT_PHONE),
    updatedAt: new Date().toISOString(),
  };
}

test.beforeAll(async () => {
  fx = await seedRegisterFixtures();
});

test.afterAll(async () => {
  await cleanupRegisterFixtures();
  await closeRegisterFixtures();
});

test.beforeEach(async ({ page }) => {
  // BFF cookies (mid-onboarding: has_profile=0) + the client auth flag the
  // register page checks to decide whether to skip the phone/OTP steps.
  await page.context().addCookies([
    { name: 'astalakshimi.auth_token', value: fx.token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
    { name: 'astalakshimi.refresh_token', value: fx.token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
    { name: 'astalakshimi.has_profile', value: '0', url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
  ]);
  await page.addInitScript((draft) => {
    localStorage.setItem('is_authenticated', 'true');
    localStorage.setItem('astalakshimi.signup_draft', JSON.stringify(draft));
  }, signupDraft());
});

const readDraft = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('astalakshimi.signup_draft');
    return raw ? JSON.parse(raw) : null;
  });

// ─── 1 + 3: pre-fill, editing, draft persistence ─────────────────────────────

test('preferences step opens with "same as me" pre-filled from the community step', async ({ page }) => {
  await page.goto('/register');

  await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible({ timeout: 30_000 });

  // Own religion/community/tongue/city become the preferences (owner is
  // Hindu / Brahmin / Tamil / Chennai per the seeded draft).
  await expect(page.getByText('Hindu', { exact: true })).toBeVisible();
  await expect(page.getByText('Brahmin', { exact: true })).toBeVisible();
  await expect(page.getByText('Tamil', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Preferred locations')).toHaveValue('Chennai');

  // Marital status is required and is not same-as-me / defaulted.
  await expect(page.getByText('Never Married', { exact: true })).toHaveCount(0);
  const minAge = await page.getByLabel('Preferred minimum age').inputValue();
  const maxAge = await page.getByLabel('Preferred maximum age').inputValue();
  expect(Number(minAge)).toBeGreaterThanOrEqual(18);
  expect(Number(maxAge)).toBeGreaterThanOrEqual(Number(minAge));
});

test('editing the preferences writes the member’s real choices to the draft', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible({ timeout: 30_000 });

  // Age range — deliberately different from the old fabricated 24-32 default.
  await page.getByLabel('Preferred minimum age').fill(String(CHOSEN_PREFS.prefAgeMin));
  await page.getByLabel('Preferred maximum age').fill(String(CHOSEN_PREFS.prefAgeMax));

  // Add a second preferred religion on top of the "same as me" Hindu.
  await page.getByLabel('Preferred religion').click();
  await page.getByRole('option', { name: 'Jain' }).click();
  await page.keyboard.press('Escape');

  await page.getByLabel('Preferred marital status').click();
  await page.getByRole('option', { name: 'Never Married' }).click();
  await page.getByRole('option', { name: 'Divorced' }).click();
  await page.keyboard.press('Escape');

  // Minimum education is optional — set it to prove it flows through.
  await page.getByLabel('Minimum education').click();
  await page.getByRole('option', { name: CHOSEN_PREFS.prefMinEducation }).click();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /continue/i }).click();

  // Advanced to the photos/verification step.
  await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toHaveCount(0);

  const draft = await readDraft(page);
  expect(draft.data.prefAgeMin).toBe(CHOSEN_PREFS.prefAgeMin);
  expect(draft.data.prefAgeMax).toBe(CHOSEN_PREFS.prefAgeMax);
  expect(draft.data.prefReligion).toEqual(expect.arrayContaining(['Hindu', 'Jain']));
  expect(draft.data.prefMaritalStatuses).toEqual(expect.arrayContaining(['Never Married', 'Divorced']));
  expect(draft.data.prefMinEducation).toBe(CHOSEN_PREFS.prefMinEducation);
  expect(draft.data.prefCastes).toEqual(['Brahmin']);
  expect(draft.data.prefMotherTongues).toEqual(['Tamil']);
  expect(draft.data.prefLocations).toEqual(['Chennai']);
});

// ─── 2: edge cases that must block Continue ─────────────────────────────────

test('clearing the minimum age blocks Continue with a message', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel('Preferred minimum age').fill('');
  await page.getByRole('button', { name: /continue/i }).click();

  await expect(page.getByText("Enter the minimum age you're looking for.")).toBeVisible();
  // Still on the preferences step.
  await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible();
});

test('an inverted age range blocks Continue with a message', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel('Preferred minimum age').fill('45');
  await page.getByLabel('Preferred maximum age').fill('30');
  await page.getByRole('button', { name: /continue/i }).click();

  await expect(page.getByText('Minimum age cannot be above maximum age.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible();
});

test('leaving marital status empty blocks Continue with a message', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: /continue/i }).click();

  await expect(page.getByText(/at least one preferred marital status/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible();
});

test('removing every preferred religion blocks Continue with a message', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible({ timeout: 30_000 });

  // Drop the "same as me" religion chip, leaving the required list empty.
  await page.getByRole('button', { name: 'Remove Hindu' }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  await expect(page.getByText('Select at least one preferred religion.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Who are you looking for?' })).toBeVisible();
});

// ─── 4: persistence + match-engine impact ───────────────────────────────────

test('registering stores the chosen preferences and they drive the matches', async ({ page }) => {
  // Register through the same BFF the wizard uses, with the values the step
  // collects (photo/OTP providers are stubbed out of the picture).
  const res = await page.request.post('/api/proxy/profiles/complete-registration', {
    data: {
      profileFor: 'Myself',
      fullName: REGISTRANT_NAME,
      gender: 'Male',
      dobDay: '15',
      dobMonth: '06',
      dobYear: '1995',
      maritalStatus: 'Never Married',
      heightCm: 175,
      diet: 'Vegetarian',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      citySlug: 'chennai-tamil-nadu',
      religion: 'Hindu',
      caste: 'Brahmin',
      communitySlug: 'hindu-brahmin',
      motherTongue: 'Tamil',
      familyType: 'Nuclear',
      familyValues: 'Moderate',
      brothersCount: 1,
      sistersCount: 0,
      photoPrivacy: 'visible',
      photoS3Keys: [`profiles/${fx.userId}/photos/11111111-1111-4111-8111-111111111111.jpeg`],
      verificationMethod: 'selfie',
      selfieS3Key: `verifications/${fx.userId}/selfie-22222222-2222-4222-8222-222222222222.jpeg`,
      govtIdType: 'PAN card',
      govtIdS3Key: `verifications/${fx.userId}/govt-id-33333333-3333-4333-8333-333333333333.pdf`,
      ...CHOSEN_PREFS,
    },
  });
  expect(res.ok(), `registration failed: ${res.status()} ${await res.text()}`).toBeTruthy();

  // What the member picked is what got stored — not the old fabricated defaults.
  const meRes = await page.request.get('/api/proxy/profiles/me');
  expect(meRes.ok()).toBeTruthy();
  const me = await meRes.json();
  const prefs = me.preferences;
  expect(prefs.prefAgeMin).toBe(CHOSEN_PREFS.prefAgeMin);
  expect(prefs.prefAgeMax).toBe(CHOSEN_PREFS.prefAgeMax);
  expect(prefs.prefReligions).toEqual(expect.arrayContaining(CHOSEN_PREFS.prefReligions));
  expect(prefs.prefMaritalStatuses).toEqual(expect.arrayContaining(CHOSEN_PREFS.prefMaritalStatuses));
  expect(prefs.prefCastes).toEqual(expect.arrayContaining(CHOSEN_PREFS.prefCastes));
  expect(prefs.prefMotherTongues).toEqual(expect.arrayContaining(CHOSEN_PREFS.prefMotherTongues));
  expect(prefs.prefMinEducation).toBe(CHOSEN_PREFS.prefMinEducation);
  expect(prefs.prefReligions).not.toEqual(['Hindu']);
  expect(prefs.prefMaritalStatuses).not.toEqual(['Never Married']);
  expect(prefs.prefAgeMin).not.toBe(24);

  const topRes = await page.request.get('/api/proxy/matches/top');
  expect(topRes.ok()).toBeTruthy();
  const top = (await topRes.json()) as Array<{ id: string; fullName: string; matchPercent?: number }>;
  const ids = top.map((m) => m.id);
  expect(ids).toContain(fx.matchProfileId);
  expect(ids).not.toContain(fx.nonMatchProfileId);

  const match = top.find((m) => m.id === fx.matchProfileId)!;
  expect(match.matchPercent).toBeUndefined();
});
