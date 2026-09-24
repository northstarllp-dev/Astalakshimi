/**
 * Discover sub-tabs end-to-end: "For you" (preference-gated) vs. "Browse"
 * (full eligible catalog), plus URL sync, the Home "See all" deep-link,
 * and the legacy /search redirect.
 *
 * Seeded via e2e/helpers/match-fixtures.ts and authenticated by injecting the
 * BFF cookies with a locally-minted JWT — OTP login needs a real SMS provider.
 */
import { test, expect } from '@playwright/test';
import {
  seedMatchFixtures,
  cleanupMatchFixtures,
  closeMatchFixtures,
  CANDIDATE_A_NAME,
  CANDIDATE_B_NAME,
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

test.describe('Discover sub-tabs', () => {
  test('defaults to the For you sub-tab', async ({ page }) => {
    await page.goto('/dashboard');

    const matchesTab = page.getByRole('tab', { name: 'For you' });
    await expect(matchesTab).toBeVisible({ timeout: 30_000 });
    await expect(matchesTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText(/age, religion, and marital status/i)).toBeVisible({
      timeout: 30_000,
    });
  });

  test('toggles to Browse and back to For you', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('tab', { name: 'For you' })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('tab', { name: 'Browse' }).click();

    await expect(page).toHaveURL(/view=search/);
    await expect(page.getByRole('button', { name: 'All profiles' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('tab', { name: 'Browse' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.getByRole('tab', { name: 'For you' }).click();
    await expect(page).not.toHaveURL(/view=search/);
    await expect(page.getByText(/age, religion, and marital status/i)).toBeVisible({
      timeout: 30_000,
    });
  });

  test('opens Browse directly from ?view=search', async ({ page }) => {
    await page.goto('/dashboard?view=search');

    const searchTab = page.getByRole('tab', { name: 'Browse' });
    await expect(searchTab).toBeVisible({ timeout: 30_000 });
    await expect(searchTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'All profiles' })).toBeVisible();
    await expect(page.getByText('profiles found')).toBeVisible({ timeout: 30_000 });
  });

  test('Home "See all" deep-links to For you', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Your top matches' })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('link', { name: 'See all' }).click();

    await expect(page).toHaveURL(/view=matches/);
    await expect(page.getByRole('tab', { name: 'For you' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('legacy /search redirects into Browse', async ({ page }) => {
    await page.goto('/search');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('tab', { name: 'Browse' })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 30_000 },
    );
  });

  test('For you never shows a match percent', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto('/dashboard');
    await expect(page.getByRole('tab', { name: 'For you' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Checking your profile/i)).toBeHidden({ timeout: 45_000 });
    await expect(page.getByText('%')).toHaveCount(0);
  });

  test('For you omits wrong-religion and wrong-marital profiles', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/dashboard');
    await expect(page.getByRole('tab', { name: 'For you' })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 30_000 },
    );
    await expect(page.getByText(/Checking your profile/i)).toBeHidden({ timeout: 45_000 });

    await expect(
      page.getByRole('link', { name: new RegExp(CANDIDATE_A_NAME) }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(CANDIDATE_C_NAME)).toHaveCount(0);
    await expect(page.getByText(CANDIDATE_D_NAME)).toHaveCount(0);
  });

  test('Browse with no filters lists every opposite-gender candidate', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/dashboard?view=search');
    await expect(page.getByRole('tab', { name: 'Browse' })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 30_000 },
    );

    await expect(page.getByText(/profiles found/i)).toBeVisible({ timeout: 45_000 });
    await expect.poll(async () => {
      const text = await page.getByText(/\d+\s+profiles found/i).first().textContent();
      const n = Number((text || '').match(/(\d+)/)?.[1] || 0);
      return n;
    }).toBeGreaterThanOrEqual(4);

    await expect(
      page.getByRole('link', { name: new RegExp(CANDIDATE_A_NAME) }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('link', { name: new RegExp(CANDIDATE_B_NAME) }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('link', { name: new RegExp(CANDIDATE_C_NAME) }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('link', { name: new RegExp(CANDIDATE_D_NAME) }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('%')).toHaveCount(0);
  });

  test('Verified browse tab only keeps admin-verified profiles', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/dashboard?view=search');
    await expect(page.getByRole('button', { name: 'Verified' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Verified' }).click();

    await expect(page.getByText(/profiles found/i)).toBeVisible({ timeout: 45_000 });
    await expect(
      page.getByRole('link', { name: new RegExp(CANDIDATE_A_NAME) }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('Nearby browse tab keeps same-city candidate A', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/dashboard?view=search');
    await expect(page.getByRole('button', { name: 'Nearby' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Nearby' }).click();

    await expect(page.getByText(/profiles found/i)).toBeVisible({ timeout: 45_000 });
    await expect(
      page.getByRole('link', { name: new RegExp(CANDIDATE_A_NAME) }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('New profiles browse tab still lists candidates', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/dashboard?view=search');
    await expect(page.getByRole('button', { name: 'New profiles' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: 'New profiles' }).click();

    await expect(page.getByText(/profiles found/i)).toBeVisible({ timeout: 45_000 });
    await expect.poll(async () => {
      const text = await page.getByText(/\d+\s+profiles found/i).first().textContent();
      return Number((text || '').match(/(\d+)/)?.[1] || 0);
    }).toBeGreaterThanOrEqual(4);
  });
});
