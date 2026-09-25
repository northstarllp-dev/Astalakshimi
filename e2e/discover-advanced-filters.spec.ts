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

test.describe('Discover Advanced Filters', () => {
  test('shows paywall for free users clicking advanced filters', async ({ page }) => {
    await page.route('**/api/proxy/payments/subscription', async route => {
      await route.fulfill({ json: { planSlug: 'free' } });
    });

    await page.goto('/dashboard?view=search');
    
    const filterBtn = page.getByRole('button', { name: /Age & filters/i });
    await expect(filterBtn).toBeVisible({ timeout: 30_000 });
    await filterBtn.click();
    
    const advancedFiltersBtn = page.getByRole('button', { name: /Advanced filters/i });
    await advancedFiltersBtn.click();

    // Should show paywall message on the page
    const paywallMsg = page.getByText(/is a Premium feature/i);
    await expect(paywallMsg).toBeVisible();
  });

  test('allows paid users to select advanced filters', async ({ page }) => {
    await page.route('**/api/proxy/payments/subscription', async route => {
      await route.fulfill({ json: { planSlug: 'premium' } });
    });

    await page.goto('/dashboard?view=search');
    
    const filterBtn = page.getByRole('button', { name: /Age & filters/i });
    await expect(filterBtn).toBeVisible({ timeout: 30_000 });
    await filterBtn.click();
    
    const advancedFiltersBtn = page.getByRole('button', { name: /Advanced filters/i });
    await advancedFiltersBtn.click();

    // Should open the "More filters" modal
    const moreFiltersHeading = page.getByRole('heading', { name: 'More filters' });
    await expect(moreFiltersHeading).toBeVisible();

    // Toggle Diet -> Vegetarian
    const dietSectionBtn = page.getByRole('button', { name: 'Diet' });
    await dietSectionBtn.click();
    
    const vegetarianCheckbox = page.getByLabel('Vegetarian', { exact: true });
    await vegetarianCheckbox.check();

    // Close "More filters" modal
    const closeBtn = page.getByRole('button', { name: 'Close' });
    await closeBtn.click();

    // The filter chip should now be visible in the active filters row
    const dietChip = page.getByText('Vegetarian', { exact: true }).first();
    await expect(dietChip).toBeVisible();
    
    // The active filter count should also appear
    const activeCount = page.getByText('Clear all (1)');
    await expect(activeCount).toBeVisible();
  });
});
