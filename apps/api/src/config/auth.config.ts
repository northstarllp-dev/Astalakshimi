import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('astalakshimi-')) {
    throw new Error(
      'Refusing to start: JWT_SECRET must be a strong random value (32+ characters). Generate one with: openssl rand -hex 32',
    );
  }

  const smsProvider = process.env.SMS_PROVIDER?.trim() || '';
  if (!smsProvider) {
    throw new Error(
      'Refusing to start: SMS_PROVIDER must be set (use "apitxt" with APITXT_AUTH_KEY, or "msg91").',
    );
  }

  return {
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    otpTtlSeconds: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),
    otpMaxPerPhonePerWindow: parseInt(process.env.OTP_MAX_PER_PHONE_PER_WINDOW || '3', 10),
    otpSendWindowSeconds: parseInt(process.env.OTP_SEND_WINDOW_SECONDS || '600', 10),
    smsProvider,
    msg91AuthKey: process.env.MSG91_AUTH_KEY || '',
    msg91SenderId: process.env.MSG91_SENDER_ID || '',
    msg91TemplateId: process.env.MSG91_TEMPLATE_ID || '',
    apitxtAuthKey: process.env.APITXT_AUTH_KEY || '',
    apitxtChannel: process.env.APITXT_CHANNEL || 'sms',
    apitxtTemplateId: process.env.APITXT_TEMPLATE_ID || '',
    apitxtTemplateName: process.env.APITXT_TEMPLATE_NAME || '',
    apitxtProjectRefId: process.env.APITXT_PROJECT_REF_ID || '',
    apitxtCountry: process.env.APITXT_COUNTRY || '91',
  };
});
