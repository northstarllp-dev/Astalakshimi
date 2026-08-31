import { z } from 'zod';
import { phoneRegex } from './auth';
import { genderSchema, maritalStatusSchema } from './profile';

export const adminCreateProfileSchema = z.object({
  profileFor: z.string().min(1, 'Choose who this profile is for.'),
  phone: z.string().regex(phoneRegex, 'Enter a valid 10-digit mobile number.'),
  fullName: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters.')
    .max(100)
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters.'),
  gender: genderSchema,
  dobDay: z.string().regex(/^(0[1-9]|[12]\d|3[01])$/, 'Enter a valid day.'),
  dobMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Enter a valid month.'),
  dobYear: z.string().regex(/^(19\d{2}|20\d{2})$/, 'Enter a valid year.'),
  maritalStatus: maritalStatusSchema,
  city: z.string().trim().min(2, 'Enter city.').max(100),
  state: z.string().trim().min(2).max(100).optional(),
  religion: z.string().min(1, 'Select religion.'),
  caste: z.string().trim().min(2, 'Enter caste or community.').max(100),
  motherTongue: z.string().min(1, 'Select mother tongue.'),
  brothersCount: z.number().int().min(0).max(5),
  sistersCount: z.number().int().min(0).max(5),
  aboutMe: z.string().max(1000).optional(),
});

export const adminAttachPhotosSchema = z.object({
  s3Keys: z.array(z.string().min(1)).min(1).max(6),
});

export type AdminCreateProfileInput = z.infer<typeof adminCreateProfileSchema>;
export type AdminAttachPhotosInput = z.infer<typeof adminAttachPhotosSchema>;
