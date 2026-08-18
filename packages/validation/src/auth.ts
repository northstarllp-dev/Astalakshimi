import { z } from 'zod';

export const phoneRegex = /^[6-9]\d{9}$/;

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number too long')
    .refine((val) => /^\+?[0-9]{10,15}$/.test(val.replace(/\s+/g, '')), {
      message: 'Please enter a valid mobile number',
    }),
  consentAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Terms of Service & Privacy Policy to continue',
  }),
  referredBy: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10, 'Phone number is required'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
