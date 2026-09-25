import { scoreMessage } from '../../src/chat/guard/rules.constant';
import {
  ALLOWED_CHAT_MESSAGES,
  BLOCKED_CONTACT_MESSAGES,
} from '../fixtures/contact-sharing.cases';

describe('Chat contact sharing — moderation rules (unit)', () => {
  it.each(BLOCKED_CONTACT_MESSAGES)('blocks $label', ({ text }) => {
    const result = scoreMessage(text);
    expect(result.severity).toBe('block');
  });

  it.each(ALLOWED_CHAT_MESSAGES)('allows $label', ({ text }) => {
    const result = scoreMessage(text);
    expect(result.severity).toBe('allow');
  });

  it('still blocks a second UPI id after a previous UPI match', () => {
    const first = scoreMessage('pay priya.sharma@okicici');
    const second = scoreMessage('gpay priya98@ybl');
    expect(first.severity).toBe('block');
    expect(second.severity).toBe('block');
  });

  it('still blocks a second phone number after a previous phone match', () => {
    expect(scoreMessage('Call me on 9876543210').severity).toBe('block');
    expect(scoreMessage('Or 9123456780').severity).toBe('block');
  });
});

describe('Chat contact sharing — ContactGuardService (unit)', () => {
  let checkMessage: (
    text: string,
    context?: { recentSenderMessages?: string[] },
  ) => Promise<{ status: string; reason?: string }>;

  beforeAll(async () => {
    const { ContactGuardService } = await import('../../src/chat/guard/contact-guard.service');
    const guard = new ContactGuardService();
    checkMessage = (text, context) => guard.checkMessage(text, context);
  });

  it.each(BLOCKED_CONTACT_MESSAGES)('blocks $label before it can be stored', async ({ text }) => {
    const result = await checkMessage(text);
    expect(result.status).toBe('BLOCKED');
    expect(result.reason === 'CONTACT_INFORMATION' || result.reason === 'CONTACT_SOLICITATION').toBe(
      true,
    );
  });

  it.each(ALLOWED_CHAT_MESSAGES)('allows $label', async ({ text }) => {
    const result = await checkMessage(text);
    expect(result.status).toBe('ALLOW');
  });

  it('blocks the same phone number on a second send', async () => {
    const first = await checkMessage('Call me on 9876543210');
    const second = await checkMessage('Call me on 9876543210');
    expect(first.status).toBe('BLOCKED');
    expect(second.status).toBe('BLOCKED');
  });

  it('blocks a phone split across two messages', async () => {
    const result = await checkMessage('43210', { recentSenderMessages: ['98765'] });
    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toBe('CONTACT_INFORMATION');
  });

  it('blocks a phone sent one digit at a time', async () => {
    const result = await checkMessage('0', {
      recentSenderMessages: ['9', '8', '7', '6', '5', '4', '3', '2', '1'],
    });
    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toBe('CONTACT_INFORMATION');
  });

  it('blocks a phone sent two digits at a time', async () => {
    const result = await checkMessage('10', {
      recentSenderMessages: ['98', '76', '54', '32'],
    });
    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toBe('CONTACT_INFORMATION');
  });

  it('allows unrelated digit fragments that do not form a phone', async () => {
    const result = await checkMessage('34', { recentSenderMessages: ['12'] });
    expect(result.status).toBe('ALLOW');
  });
});
