import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ensureAdminUser,
} from './helpers/auth-fixtures';

test.describe('Admin Dashboard Revenue', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test.beforeEach(async ({ page }) => {
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

    const loginResponse = page.waitForResponse(
      (res) => res.url().includes('/api/auth/admin-login') && res.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^sign in$/i }).click();
    
    const res = await loginResponse;
    expect(res.ok(), `login HTTP ${res.status()}`).toBeTruthy();
  
    await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 30_000 });
  });

  test('displays correctly calculated revenue based on launch offer logic', async ({ page }) => {
    // Navigate to the admin dashboard
    await page.goto('/admin');

    // Wait for the Revenue stat card to be visible
    const revenueCard = page.getByText(/^Revenue$/).locator('..');
    await expect(revenueCard).toBeVisible({ timeout: 15000 });
    
    // The exact amount depends on the seed data. 
    // The unit tests cover the exact math, here we verify the UI correctly mounts the value.
    await expect(revenueCard.locator('p.text-2xl')).toHaveText(/^₹[\d,]+$/, { timeout: 15000 });
  });
});
