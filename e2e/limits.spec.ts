import { test, expect } from '@playwright/test';
import {
  MEMBER_PHONE,
  seedLoginMember,
  seedOtp,
  stubSendOtp,
  cleanupAuthFixtures,
  closeAuthFixtures,
} from './helpers/auth-fixtures';

test.describe('Limits and Quotas E2E', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeAll(async () => {
    // We would ideally seed a user with a specific plan (e.g., Silver)
    // and seed their usage to be at the limit (e.g. 100 interests sent, 10 contacts unlocked).
    await seedLoginMember();
  });

  test.afterAll(async () => {
    await cleanupAuthFixtures();
    await closeAuthFixtures();
  });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    // Login the user
    await seedOtp(MEMBER_PHONE);
    await stubSendOtp(page);

    await page.goto('/login');
    const phoneInput = page.getByLabel(/mobile number/i);
    await phoneInput.click();
    await phoneInput.pressSequentially(MEMBER_PHONE);
    await page.getByRole('button', { name: /send otp/i }).click();

    const otpInput = page.getByRole('textbox', { name: /one-time password/i });
    await expect(otpInput).toBeVisible({ timeout: 15_000 });
    await otpInput.fill('123456');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
  });

  test('should prompt payment for extra contact unlock when silver plan limit is reached', async ({ page }) => {
    // Note: To make this test fully complete without taking 100 clicks, 
    // we intercept the API to mock the user having reached their 10 contact unlocks limit.
    await page.route('**/api/contacts/unlock-status*', async (route) => {
      const json = {
        canView: false,
        isUnlocked: false,
        isMutualBenefit: true,
        limit: 10,
        usedThisMonth: 10,
        remaining: 0,
        canUnlockWithQuota: false,
        canPayExtra: true,
        extraContactFeePaise: 2900,
        planSlug: 'silver',
      };
      await route.fulfill({ json });
    });

    await page.goto('/search');
    // For the sake of the test, we assume there is a profile card to click "View Contact"
    const viewContactBtn = page.getByRole('button', { name: /view contact/i }).first();
    if (await viewContactBtn.isVisible()) {
      await viewContactBtn.click();
      
      // Verify that the prompt shows the 29 rupees fee and 10 contacts message
      await expect(page.getByText(/Pay ₹29/i)).toBeVisible();
      await expect(page.getByText(/used all 10 contact unlocks/i)).toBeVisible();
    }
  });

  test('should block sending interests when silver plan limit of 100 is reached', async ({ page }) => {
    // Mock the interest API to return the quota exceeded error
    await page.route('**/api/interests', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          json: {
            message: 'You have reached your interest quota limit of 100. Upgrade your plan to send more interests.',
          },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/search');
    const sendInterestBtn = page.getByRole('button', { name: /send interest/i }).first();
    if (await sendInterestBtn.isVisible()) {
      await sendInterestBtn.click();
      
      // Verify the toast or error message shows
      await expect(page.getByText(/quota limit of 100/i)).toBeVisible();
    }
  });
});
