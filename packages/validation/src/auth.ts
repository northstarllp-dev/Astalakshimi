import { z } from 'zod';

export const phoneRegex = /^[6-9]\d{9}$/;

const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number too long')
  .refine((val) => /^\+?[0-9]{10,15}$/.test(val.replace(/\s+/g, '')), {
    message: 'Please enter a valid mobile number',
  });

export const sendOtpSchema = z.object({
  phone: phoneSchema,
  consentAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Terms of Service & Privacy Policy to continue',
  }),
  referredBy: z.string().max(50, 'Referral code too long').optional(),
  type: z.enum(['login', 'register']).optional(),
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
});

export const checkPhoneSchema = z.object({
  phone: phoneSchema,
});

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CheckPhoneInput = z.infer<typeof checkPhoneSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
