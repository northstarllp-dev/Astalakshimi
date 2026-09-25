/**
 * Interests end-to-end: send → accept → mutual, withdraw, and IDOR denial.
 * Uses seeded verified members and BFF cookie auth (same pattern as matches.spec.ts).
 */
import { test, expect } from '@playwright/test';
import {
  seedInterestFixtures,
  cleanupInterestFixtures,
  closeInterestFixtures,
  SENDER_NAME,
  RECEIVER_NAME,
  type InterestFixtures,
} from './helpers/interest-fixtures';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

let fx: InterestFixtures;

async function authCookies(token: string) {
  return [
    { name: 'astalakshimi.auth_token', value: token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' as const },
    { name: 'astalakshimi.refresh_token', value: token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' as const },
    { name: 'astalakshimi.has_profile', value: '1', url: BASE_URL, httpOnly: true, sameSite: 'Lax' as const },
  ];
}

test.beforeAll(async () => {
  fx = await seedInterestFixtures();
});

test.afterAll(async () => {
  await cleanupInterestFixtures();
  await closeInterestFixtures();
});

test('send → accept creates a mutual connection visible on /interests', async ({ browser }) => {
  test.setTimeout(90_000);

  const senderCtx = await browser.newContext();
  await senderCtx.addCookies(await authCookies(fx.senderToken));
  await senderCtx.addInitScript(() => localStorage.setItem('is_authenticated', 'true'));
  const senderPage = await senderCtx.newPage();

  const sendRes = await senderPage.request.post('/api/proxy/interests', {
    data: { targetProfileId: fx.receiverProfileId, message: 'E2E hello' },
  });
  expect(sendRes.ok()).toBeTruthy();
  const sent = await sendRes.json();
  expect(sent.status).toBe('pending');

  const sentList = await senderPage.request.get('/api/proxy/interests/sent');
  expect(sentList.ok()).toBeTruthy();
  const sentBody = await sentList.json();
  expect(sentBody.some((i: { profileId: string; status: string }) => i.profileId === fx.receiverProfileId && i.status === 'pending')).toBe(true);

  await senderPage.goto('/interests');
  await expect(senderPage.getByRole('tab', { name: 'Sent' })).toBeVisible({ timeout: 30_000 });
  await senderPage.getByRole('tab', { name: 'Sent' }).click();
  await expect(senderPage.getByText(RECEIVER_NAME).first()).toBeVisible({ timeout: 30_000 });

  const receiverCtx = await browser.newContext();
  await receiverCtx.addCookies(await authCookies(fx.receiverToken));
  await receiverCtx.addInitScript(() => localStorage.setItem('is_authenticated', 'true'));
  const receiverPage = await receiverCtx.newPage();

  const received = await receiverPage.request.get('/api/proxy/interests/received?status=pending');
  expect(received.ok()).toBeTruthy();
  const receivedBody = await received.json();
  expect(receivedBody.some((i: { profileId: string }) => i.profileId === fx.senderProfileId)).toBe(true);

  await receiverPage.goto('/interests');
  await expect(receiverPage.getByText(SENDER_NAME).first()).toBeVisible({ timeout: 30_000 });
  await receiverPage.getByRole('button', { name: 'Accept' }).first().click();

  await expect
    .poll(async () => {
      const mutual = await receiverPage.request.get('/api/proxy/interests/mutual');
      const body = await mutual.json();
      return body.some((i: { profileId: string; status: string }) => i.profileId === fx.senderProfileId);
    }, { timeout: 20_000 })
    .toBe(true);

  const senderMutual = await senderPage.request.get('/api/proxy/interests/mutual');
  expect(senderMutual.ok()).toBeTruthy();
  const senderMutualBody = await senderMutual.json();
  expect(senderMutualBody.some((i: { profileId: string }) => i.profileId === fx.receiverProfileId)).toBe(true);

  await senderCtx.close();
  await receiverCtx.close();
});

test('sender can withdraw a pending interest', async ({ browser }) => {
  test.setTimeout(60_000);

  // Fresh pair via API: re-seed would wipe other tests; use bystander as target for withdraw.
  const senderCtx = await browser.newContext();
  await senderCtx.addCookies(await authCookies(fx.senderToken));
  const senderPage = await senderCtx.newPage();

  const sendRes = await senderPage.request.post('/api/proxy/interests', {
    data: { targetProfileId: fx.bystanderProfileId },
  });
  expect(sendRes.ok()).toBeTruthy();

  const withdrawRes = await senderPage.request.patch(
    `/api/proxy/interests/${fx.bystanderProfileId}/withdraw`,
  );
  expect(withdrawRes.ok()).toBeTruthy();
  const withdrawn = await withdrawRes.json();
  expect(withdrawn.status).toBe('withdrawn');

  await senderCtx.close();
});

test('bystander cannot accept another pair\'s interest (IDOR)', async ({ browser }) => {
  test.setTimeout(60_000);

  // Ensure a pending interest exists from sender → receiver (may already be accepted from first test).
  // Seed a one-off pending interest by withdrawing+resending if needed, or use a fresh DB row.
  const senderCtx = await browser.newContext();
  await senderCtx.addCookies(await authCookies(fx.senderToken));
  const senderPage = await senderCtx.newPage();

  // If already connected, decline path won't work; use bystander as receiver of a new interest from sender,
  // then have the real receiver try to accept that interest UUID.
  // Simpler: create interest sender→bystander if not pending, then have receiver try to accept it.
  let interestId: string | undefined;
  const sendRes = await senderPage.request.post('/api/proxy/interests', {
    data: { targetProfileId: fx.bystanderProfileId, message: 'idor probe' },
  });
  if (sendRes.ok()) {
    interestId = (await sendRes.json()).id;
  } else {
    // may already be withdrawn; reopen
    const sent = await (await senderPage.request.get('/api/proxy/interests/sent')).json();
    const row = sent.find((i: { profileId: string }) => i.profileId === fx.bystanderProfileId);
    interestId = row?.id;
    if (row?.status === 'withdrawn') {
      const reopen = await senderPage.request.post('/api/proxy/interests', {
        data: { targetProfileId: fx.bystanderProfileId },
      });
      expect(reopen.ok()).toBeTruthy();
      interestId = (await reopen.json()).id;
    }
  }
  expect(interestId).toBeTruthy();

  const bystanderCtx = await browser.newContext();
  // Use receiver token as the unauthorized third party relative to sender→bystander interest
  await bystanderCtx.addCookies(await authCookies(fx.receiverToken));
  const receiverPage = await bystanderCtx.newPage();

  const idor = await receiverPage.request.patch(`/api/proxy/interests/${interestId}/accept`);
  expect(idor.ok()).toBeFalsy();
  expect(idor.status()).toBeGreaterThanOrEqual(400);

  await senderCtx.close();
  await bystanderCtx.close();
});
