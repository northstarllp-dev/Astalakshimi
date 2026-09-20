import { registerAs } from '@nestjs/config';

export default registerAs('payments', () => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';

  if ((keyId && !keySecret) || (!keyId && keySecret)) {
    throw new Error(
      'Refusing to start: set both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or leave both empty until payments are wired.',
    );
  }

  return {
    razorpayKeyId: keyId,
    razorpayKeySecret: keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || '',
  };
});
