import { z } from 'zod';

export const companySearchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Enter at least 2 characters.').max(100),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export const resolveOccupationQuerySchema = z.object({
  q: z.string().trim().min(1).max(150),
});

export const resolveCompanyQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
});

export type CompanySearchQuery = z.infer<typeof companySearchQuerySchema>;
export type ResolveOccupationQuery = z.infer<typeof resolveOccupationQuerySchema>;
export type ResolveCompanyQuery = z.infer<typeof resolveCompanyQuerySchema>;
