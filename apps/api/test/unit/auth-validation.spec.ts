import { sendOtpSchema, verifyOtpSchema } from '@astalakshimi/validation';

describe('Feature 1: Authentication - Zod Validation Schemas', () => {
  describe('sendOtpSchema', () => {
    it('should accept a valid 10-digit Indian phone number with consent accepted', () => {
      const input = {
        phone: '9876543210',
        consentAccepted: true,
      };

      const result = sendOtpSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept a phone number with country code prefix and spaces', () => {
      const input = {
        phone: '+91 98765 43210',
        consentAccepted: true,
        referredBy: 'FRIEND2026',
      };

      const result = sendOtpSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.referredBy).toBe('FRIEND2026');
      }
    });

    it('should reject when consentAccepted is false', () => {
      const input = {
        phone: '9876543210',
        consentAccepted: false,
      };

      const result = sendOtpSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Terms of Service');
      }
    });

    it('should reject when consentAccepted is missing', () => {
      const input = {
        phone: '9876543210',
      };

      const result = sendOtpSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject phone numbers with letters or symbols', () => {
      const input = {
        phone: '98765abcde',
        consentAccepted: true,
      };

      const result = sendOtpSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('valid mobile number');
      }
    });

    it('should reject phone numbers that are too short (< 10 digits)', () => {
      const input = {
        phone: '12345',
        consentAccepted: true,
      };

      const result = sendOtpSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject phone numbers that are too long (> 15 digits)', () => {
      const input = {
        phone: '12345678901234567',
        consentAccepted: true,
      };

      const result = sendOtpSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('verifyOtpSchema', () => {
    it('should accept a valid 6-digit numeric OTP with phone number', () => {
      const input = {
        phone: '9876543210',
        otp: '123456',
      };

      const result = verifyOtpSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject OTP with non-numeric characters', () => {
      const input = {
        phone: '9876543210',
        otp: '12345a',
      };

      const result = verifyOtpSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('OTP must be numeric');
      }
    });

    it('should reject OTP with fewer than 6 digits', () => {
      const input = {
        phone: '9876543210',
        otp: '12345',
      };

      const result = verifyOtpSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('OTP must be 6 digits');
      }
    });

    it('should reject OTP with more than 6 digits', () => {
      const input = {
        phone: '9876543210',
        otp: '1234567',
      };

      const result = verifyOtpSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject when phone number is missing', () => {
      const input = {
        otp: '123456',
      };

      const result = verifyOtpSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
