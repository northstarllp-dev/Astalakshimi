import { z } from 'zod';

export const partnerPreferencesSchema = z
  .object({
    prefAgeMin: z.number().int().min(18, 'Minimum age is 18').max(100),
    prefAgeMax: z.number().int().min(18).max(100),
    prefHeightMinCm: z.number().int().min(120).max(230).default(140),
    prefHeightMaxCm: z.number().int().min(120).max(230).default(200),
    prefMaritalStatuses: z.array(z.string()).default(['Never Married']),
    prefReligions: z.array(z.string()).min(1, 'Please select at least one religion'),
    prefCastes: z.array(z.string()).default([]),
    prefMotherTongues: z.array(z.string()).default([]),
    prefMinEducation: z.string().optional(),
    prefAcceptableIncomes: z.array(z.string()).default([]),
    prefLocations: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.prefAgeMin > data.prefAgeMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prefAgeMax'],
        message: 'Max age must be greater than or equal to min age',
      });
    }
    if (data.prefHeightMinCm > data.prefHeightMaxCm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prefHeightMaxCm'],
        message: 'Max height must be greater than or equal to min height',
      });
    }
  });

export const searchFiltersSchema = z.object({
  lookingForGender: z.enum(['Male', 'Female', 'Other']).optional(),
  ageMin: z.coerce.number().int().min(18).max(100).optional(),
  ageMax: z.coerce.number().int().min(18).max(100).optional(),
  heightMinCm: z.coerce.number().int().min(120).max(230).optional(),
  heightMaxCm: z.coerce.number().int().min(120).max(230).optional(),
  religions: z.union([z.string().transform((v) => [v]), z.array(z.string())]).optional(),
  castes: z.union([z.string().transform((v) => [v]), z.array(z.string())]).optional(),
  motherTongues: z.union([z.string().transform((v) => [v]), z.array(z.string())]).optional(),
  educations: z.union([z.string().transform((v) => [v]), z.array(z.string())]).optional(),
  occupations: z.union([z.string().transform((v) => [v]), z.array(z.string())]).optional(),
  incomeBands: z.union([z.string().transform((v) => [v]), z.array(z.string())]).optional(),
  cities: z.union([z.string().transform((v) => [v]), z.array(z.string())]).optional(),
  states: z.union([z.string().transform((v) => [v]), z.array(z.string())]).optional(),
  maritalStatuses: z.union([z.string().transform((v) => [v]), z.array(z.string())]).optional(),
  manglik: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type PartnerPreferencesInput = z.infer<typeof partnerPreferencesSchema>;
export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;
