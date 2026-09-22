/**
 * Discover sub-tabs end-to-end: "Your Top Matches" (score-ranked, paginated)
 * vs. "Search & Filter" (the full browse/filter experience), plus the URL
 * sync, the Home "See all" deep-link, and the legacy /search redirect.
 *
 * Seeded via e2e/helpers/match-fixtures.ts and authenticated by injecting the
 * BFF cookies with a locally-minted JWT — OTP login needs a real SMS provider.
 */
import { test, expect } from '@playwright/test';
import {
  seedMatchFixtures,
  cleanupMatchFixtures,
  closeMatchFixtures,
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
  test('defaults to the "Your Top Matches" sub-tab', async ({ page }) => {
    await page.goto('/dashboard');

    const matchesTab = page.getByRole('tab', { name: 'Your Top Matches' });
    await expect(matchesTab).toBeVisible({ timeout: 30_000 });
    await expect(matchesTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('ranked by your partner preferences')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('toggles to "Search & Filter" and back to matches', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('tab', { name: 'Your Top Matches' })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('tab', { name: 'Search & Filter' }).click();

    // URL syncs to ?view=search and the browse/filter UI appears.
    await expect(page).toHaveURL(/view=search/);
    await expect(page.getByRole('button', { name: 'New profiles' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('tab', { name: 'Search & Filter' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.getByRole('tab', { name: 'Your Top Matches' }).click();
    await expect(page).not.toHaveURL(/view=search/);
    await expect(page.getByText('ranked by your partner preferences')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('opens the search panel directly from ?view=search', async ({ page }) => {
    await page.goto('/dashboard?view=search');

    const searchTab = page.getByRole('tab', { name: 'Search & Filter' });
    await expect(searchTab).toBeVisible({ timeout: 30_000 });
    await expect(searchTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'New profiles' })).toBeVisible();
    await expect(page.getByText('profiles found')).toBeVisible({ timeout: 30_000 });
  });

  test('Home "See all" deep-links to the matches sub-tab', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Your top matches' })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('link', { name: 'See all' }).click();

    await expect(page).toHaveURL(/view=matches/);
    await expect(page.getByRole('tab', { name: 'Your Top Matches' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('legacy /search redirects into the search sub-tab', async ({ page }) => {
    await page.goto('/search');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('tab', { name: 'Search & Filter' })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 30_000 },
    );
  });

  test('Your Top Matches shows the real compatibility score', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'MatchListCard % badge renders on desktop layouts only');
    test.setTimeout(60_000);

    await page.goto('/dashboard');
    await expect(page.getByText('98% match').first()).toBeVisible({ timeout: 45_000 });
  });
});
