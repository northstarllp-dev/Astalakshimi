/**
 * Live chat must refuse contact sharing on the send API and in the inbox UI,
 * and must not keep the blocked text in the thread.
 */
import { test, expect } from '@playwright/test';
import {
  ALLOWED_CHAT_MESSAGES,
  BLOCKED_CONTACT_MESSAGES,
} from '../apps/api/test/fixtures/contact-sharing.cases';
import {
  seedChatContactFixtures,
  cleanupChatContactFixtures,
  cleanupChatThreadMessages,
  closeChatContactFixtures,
  CHAT_PARTNER_NAME,
  type ChatContactFixtures,
} from './helpers/chat-contact-fixtures';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

let fx: ChatContactFixtures;

test.beforeAll(async () => {
  fx = await seedChatContactFixtures();
});

test.afterAll(async () => {
  await cleanupChatContactFixtures();
  await closeChatContactFixtures();
});

test.beforeEach(async ({ page }) => {
  await cleanupChatThreadMessages(fx.senderProfileId, fx.partnerProfileId);
  await page.context().addCookies([
    { name: 'astalakshimi.auth_token', value: fx.token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
    { name: 'astalakshimi.refresh_token', value: fx.token, url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
    { name: 'astalakshimi.has_profile', value: '1', url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
  ]);
  await page.addInitScript(() => {
    localStorage.setItem('is_authenticated', 'true');
  });
});

test('send API blocks every contact-sharing message and keeps ordinary chat', async ({ page }) => {
  test.setTimeout(120_000);
  const leaked: string[] = [];

  for (const sample of BLOCKED_CONTACT_MESSAGES) {
    const res = await page.request.post(`/api/proxy/chat/${fx.partnerProfileId}/messages`, {
      data: { text: sample.text, receiverProfileId: fx.partnerProfileId },
    });
    const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string; text?: string };
    const blocked = res.ok() && body.status === 'BLOCKED' && body.text !== sample.text;
    if (!blocked) {
      leaked.push(`${sample.label} → HTTP ${res.status()} ${JSON.stringify(body).slice(0, 240)}`);
    }
  }

  const greeting = ALLOWED_CHAT_MESSAGES[0];
  const allowed = await page.request.post(`/api/proxy/chat/${fx.partnerProfileId}/messages`, {
    data: { text: greeting.text, receiverProfileId: fx.partnerProfileId },
  });
  const allowedBody = (await allowed.json().catch(() => ({}))) as { text?: string; status?: string };
  expect(allowed.ok(), `ordinary greeting failed: ${allowed.status()} ${JSON.stringify(allowedBody)}`).toBeTruthy();
  expect(allowedBody.status).not.toBe('BLOCKED');
  expect(allowedBody.text).toBe(greeting.text);

  const thread = await page.request.get(`/api/proxy/chat/${fx.partnerProfileId}/messages`);
  expect(thread.ok()).toBeTruthy();
  const messages = (await thread.json()) as Array<{ text: string }>;
  const stored = messages.map((message) => message.text);
  expect(stored).toContain(greeting.text);
  for (const sample of BLOCKED_CONTACT_MESSAGES) {
    if (stored.includes(sample.text)) {
      leaked.push(`${sample.label} was stored in the thread`);
    }
  }

  expect(leaked).toEqual([]);
});

test('inbox blocks a phone number and does not show it in the thread', async ({ page }) => {
  test.setTimeout(90_000);
  const phone = 'Call me on 9876543210';

  await page.goto('/inbox');
  await expect(page.getByText('Checking your profile…')).toBeHidden({ timeout: 45_000 });
  await expect(page.getByRole('heading', { name: 'Inbox & Conversations' })).toBeVisible({ timeout: 45_000 });
  await page.getByRole('button', { name: new RegExp(CHAT_PARTNER_NAME) }).click();

  const input = page.getByPlaceholder(`Message ${CHAT_PARTNER_NAME}...`);
  await input.fill(phone);
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByRole('heading', { name: 'Contact Sharing Blocked' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(phone)).toHaveCount(0);

  const thread = await page.request.get(`/api/proxy/chat/${fx.partnerProfileId}/messages`);
  const messages = (await thread.json()) as Array<{ text: string }>;
  expect(messages.map((message) => message.text)).not.toContain(phone);
});

test('send API blocks a phone split across multiple digit-only messages', async ({ page }) => {
  test.setTimeout(90_000);

  async function sendShard(text: string) {
    return page.request.post(`/api/proxy/chat/${fx.partnerProfileId}/messages`, {
      data: { text, receiverProfileId: fx.partnerProfileId },
    });
  }

  const first = await sendShard('98765');
  const firstBody = (await first.json()) as { status?: string; text?: string };
  expect(first.ok(), `first shard failed: ${first.status()} ${JSON.stringify(firstBody)}`).toBeTruthy();
  expect(firstBody.status).not.toBe('BLOCKED');

  const second = await sendShard('43210');
  const secondBody = (await second.json()) as { status?: string; text?: string };
  expect(second.ok()).toBeTruthy();
  expect(secondBody.status).toBe('BLOCKED');
  expect(secondBody.text).not.toBe('43210');

  const thread = await page.request.get(`/api/proxy/chat/${fx.partnerProfileId}/messages`);
  const messages = (await thread.json()) as Array<{ text: string }>;
  const stored = messages.map((message) => message.text);
  expect(stored).not.toContain('43210');
});

test('send API blocks a phone sent one digit at a time', async ({ page }) => {
  test.setTimeout(120_000);

  for (const digit of ['9', '8', '7', '6', '5', '4', '3', '2', '1']) {
    const res = await page.request.post(`/api/proxy/chat/${fx.partnerProfileId}/messages`, {
      data: { text: digit, receiverProfileId: fx.partnerProfileId },
    });
    const body = (await res.json()) as { status?: string };
    expect(res.ok(), `digit ${digit} failed: ${res.status()} ${JSON.stringify(body)}`).toBeTruthy();
    expect(body.status).not.toBe('BLOCKED');
  }

  const final = await page.request.post(`/api/proxy/chat/${fx.partnerProfileId}/messages`, {
    data: { text: '0', receiverProfileId: fx.partnerProfileId },
  });
  const finalBody = (await final.json()) as { status?: string; text?: string };
  expect(final.ok()).toBeTruthy();
  expect(finalBody.status).toBe('BLOCKED');
  expect(finalBody.text).not.toBe('0');

  const thread = await page.request.get(`/api/proxy/chat/${fx.partnerProfileId}/messages`);
  const messages = (await thread.json()) as Array<{ text: string }>;
  expect(messages.map((message) => message.text)).not.toContain('0');
});
