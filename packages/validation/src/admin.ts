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
  hasChildren: z.boolean().optional(),
  childrenCount: z.number().int().optional(),
  childrenLivingWithMe: z.boolean().nullable().optional(),
  height: z.string().min(1, 'Enter height.'),
  diet: z.enum(['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Jain', 'Vegan']).optional(),
  city: z.string().trim().min(2, 'Enter city.').max(100),
  state: z.string().trim().min(2).max(100).optional(),
  religion: z.string().min(1, 'Select religion.'),
  caste: z.string().trim().min(2, 'Enter caste or community.').max(100),
  motherTongue: z.string().min(1, 'Select mother tongue.'),
  educationLevel: z.string().min(1, 'Select education level.'),
  employmentStatus: z.string().min(1, 'Select employment status.'),
  annualIncome: z.string().min(1, 'Select annual income.'),
  brothersCount: z.number().int().min(0).max(5),
  sistersCount: z.number().int().min(0).max(5),
  aboutMe: z.string().max(1000).optional(),
  planId: z.string().optional(),
  prefAgeMin: z.number().int().min(18).max(80),
  prefAgeMax: z.number().int().min(18).max(80),
  prefHeightMinCm: z.number().int().min(120).max(230).optional(),
  prefHeightMaxCm: z.number().int().min(120).max(230).optional(),
  prefMaritalStatuses: z.array(z.string()).min(1, 'Select preferred marital statuses.'),
  prefReligions: z.array(z.string()).min(1, 'Select preferred religions.'),
  prefCastes: z.array(z.string()).optional(),
  prefMotherTongues: z.array(z.string()).optional(),
  prefLocations: z.array(z.string()).optional(),
  prefAcceptableIncomes: z.array(z.string()).optional(),
});

export const adminAttachPhotosSchema = z.object({
  s3Keys: z.array(z.string().min(1)).min(1).max(6),
});

export type AdminCreateProfileInput = z.infer<typeof adminCreateProfileSchema>;
export type AdminAttachPhotosInput = z.infer<typeof adminAttachPhotosSchema>;
