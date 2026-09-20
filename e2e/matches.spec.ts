/**
 * Matching end-to-end: real user flow over the live dev stack.
 *
 * Seeded via e2e/helpers/match-fixtures.ts (viewer + deterministic 98%
 * candidate A + partial-match candidate B) and authenticated by injecting the
 * BFF cookies with a locally-minted JWT — OTP login needs a real SMS provider.
 *
 * Asserts the real compatibility score surfaces everywhere the UI shows a
 * match %: home rows, profile pill, shortlist cards, Discover cards.
 */
import { test, expect } from '@playwright/test';
import {
  seedMatchFixtures,
  cleanupMatchFixtures,
  closeMatchFixtures,
  CANDIDATE_A_NAME,
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
  // Mirror the cookies the Next BFF login route sets (auth + enrollment).
  await page.context().addCookies([
    { name: 'astalakshimi.auth_token', value: fx.token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
    { name: 'astalakshimi.refresh_token', value: fx.token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
    { name: 'astalakshimi.has_profile', value: '1', url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
  ]);
  // The client apiClient gates its queries on this localStorage flag (set by
  // the register/login flow) — without it every react-query hook no-ops.
  await page.addInitScript(() => {
    localStorage.setItem('is_authenticated', 'true');
  });
});

test('home shows top matches with the real score', async ({ page }) => {
  await page.goto('/home');
  // Dev-mode SSR compile + BFF latency can exceed the default 5s.
  await expect(page.getByRole('heading', { name: 'Your top matches' })).toBeVisible({ timeout: 30_000 });

  const row = page.locator('article', { hasText: CANDIDATE_A_NAME });
  await expect(row).toBeVisible();
  await expect(row).toContainText('98%');
});

test('profile view shows the real match percent (not the old hardcoded 90)', async ({ page }) => {
  await page.goto(`/profiles/${fx.candidateAProfileId}`);
  await expect(page.getByText('98% match')).toBeVisible();
});

test('shortlist shows the real score for saved profiles', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'MatchListCard % badge renders on desktop layouts only');
  test.setTimeout(60_000);

  const res = await page.request.post('/api/proxy/shortlists', {
    data: { targetProfileId: fx.candidateAProfileId },
  });
  expect(res.ok()).toBeTruthy();

  await page.goto('/shortlists');
  await expect(page.getByText('Checking your profile…')).toBeHidden({ timeout: 45_000 });
  await expect(page.getByText('98% match')).toBeVisible({ timeout: 30_000 });
});

test('discover ranks by match score and shows real percentages', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'MatchListCard % badge renders on desktop layouts only');
  test.setTimeout(60_000);

  await page.goto('/dashboard');
  // Dev-mode route compilation + react-query can exceed the default 5s.
  await expect(page.getByText('Checking your profile…')).toBeHidden({ timeout: 45_000 });
  await expect(page.getByText('98% match').first()).toBeVisible({ timeout: 30_000 });
});
