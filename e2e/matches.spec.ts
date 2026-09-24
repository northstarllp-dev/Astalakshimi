/**
 * Matching end-to-end: real user flow over the live dev stack.
 *
 * Seeded via e2e/helpers/match-fixtures.ts (viewer + For you candidates +
 * Browse-only religion/marital misses). Authenticated by injecting the BFF
 * cookies with a locally-minted JWT — OTP login needs a real SMS provider.
 *
 * The product never shows a match percentage on Home, Discover, profile, or
 * shortlist.
 */
import { test, expect } from '@playwright/test';
import {
  seedMatchFixtures,
  cleanupMatchFixtures,
  closeMatchFixtures,
  CANDIDATE_A_NAME,
  CANDIDATE_C_NAME,
  CANDIDATE_D_NAME,
  type MatchFixtures,
} from './helpers/match-fixtures';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

let fx: MatchFixtures;

test.beforeAll(async () => {
  fx = await seedMatchFixtures();
});

test.afterAll(async () => {
  await cleanupMatchFixtures();
  await closeMatchFixtures();
});

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([
    { name: 'astalakshimi.auth_token', value: fx.token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
    { name: 'astalakshimi.refresh_token', value: fx.token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
    { name: 'astalakshimi.has_profile', value: '1', url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
  ]);
  await page.addInitScript(() => {
    localStorage.setItem('is_authenticated', 'true');
  });
});

test('home shows top matches with no percent', async ({ page }) => {
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'Your top matches' })).toBeVisible({ timeout: 30_000 });

  const row = page.locator('article', { hasText: CANDIDATE_A_NAME });
  await expect(row).toBeVisible();
  await expect(row).not.toContainText('%');
  await expect(page.getByText(CANDIDATE_C_NAME)).toHaveCount(0);
  await expect(page.getByText(CANDIDATE_D_NAME)).toHaveCount(0);
});

test('profile view never shows a match percent', async ({ page }) => {
  await page.goto(`/profiles/${fx.candidateAProfileId}`);
  await expect(page.getByText(CANDIDATE_A_NAME).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/% match/i)).toHaveCount(0);
});

test('shortlist never shows a match percent', async ({ page }) => {
  test.setTimeout(60_000);

  const res = await page.request.post('/api/proxy/shortlists', {
    data: { targetProfileId: fx.candidateAProfileId },
  });
  expect(res.ok()).toBeTruthy();

  await page.goto('/shortlists');
  await expect(page.getByText('Checking your profile…')).toBeHidden({ timeout: 45_000 });
  await expect(page.getByText(CANDIDATE_A_NAME).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('%')).toHaveCount(0);
});

test('For you lists preference matches and the API omits matchPercent', async ({ page }) => {
  test.setTimeout(60_000);

  const topRes = await page.request.get('/api/proxy/matches/top');
  expect(topRes.ok()).toBeTruthy();
  const top = (await topRes.json()) as Array<{ id: string; fullName: string; matchPercent?: number }>;
  const ids = top.map((m) => m.id);
  expect(ids).toContain(fx.candidateAProfileId);
  expect(ids).not.toContain(fx.candidateCProfileId);
  expect(ids).not.toContain(fx.candidateDProfileId);
  for (const match of top) {
    expect(match.matchPercent).toBeUndefined();
  }

  await page.goto('/dashboard');
  await expect(page.getByText('Checking your profile…')).toBeHidden({ timeout: 45_000 });
  await expect(page.getByRole('link', { name: new RegExp(CANDIDATE_A_NAME) }).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('%')).toHaveCount(0);
});
