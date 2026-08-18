import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'astalakshimi-dev-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  otpTtlSeconds: parseInt(process.env.OTP_TTL_SECONDS || '300', 10), // 5 minutes
  mockOtpEnabled: process.env.MOCK_OTP_ENABLED !== 'false', // Default to mock for local dev
  defaultMockOtp: process.env.DEFAULT_MOCK_OTP || '123456',
}));
