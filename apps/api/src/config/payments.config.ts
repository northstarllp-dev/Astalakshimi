import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';

const logger = new Logger('PaymentsConfig');

export default registerAs('payments', () => {
  const clientId = process.env.CASHFREE_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET?.trim() || '';
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET?.trim() || '';
  const environment = process.env.CASHFREE_ENVIRONMENT?.trim() || 'sandbox';
  const apiVersion = process.env.CASHFREE_API_VERSION?.trim() || '2025-01-01';
  const webhookReplayWindowMs =
    Number(process.env.CASHFREE_WEBHOOK_REPLAY_WINDOW_MS) || 5 * 60_000;
  const webhookIpAllowlistEnabled =
    process.env.PAYMENTS_WEBHOOK_IP_ALLOWLIST_ENABLED === 'true';
  const webhookIps = (process.env.CASHFREE_WEBHOOK_IPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!clientId || !clientSecret) {
    throw new Error(
      'Refusing to start: CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET are required.',
    );
  }

  if (!['sandbox', 'production'].includes(environment)) {
    throw new Error('CASHFREE_ENVIRONMENT must be "sandbox" or "production".');
  }

  if (!webhookSecret) {
    logger.warn(
      'CASHFREE_WEBHOOK_SECRET is not set. Webhook signature verification will reject all webhooks until configured.',
    );
  }

  return {
    cashfreeClientId: clientId,
    cashfreeClientSecret: clientSecret,
    cashfreeWebhookSecret: webhookSecret,
    cashfreeEnvironment: environment as 'sandbox' | 'production',
    cashfreeApiVersion: apiVersion,
    webhookReplayWindowMs,
    webhookIpAllowlistEnabled,
    cashfreeWebhookIps: webhookIps,
  };
});
