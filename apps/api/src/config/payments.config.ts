import { registerAs } from '@nestjs/config';

export default registerAs('payments', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (isProduction && (!keyId || !keySecret)) {
    throw new Error(
      'Refusing to start: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in production.',
    );
  }

  return {
    razorpayKeyId: keyId || 'test_key',
    razorpayKeySecret: keySecret || 'test_secret',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  };
});
