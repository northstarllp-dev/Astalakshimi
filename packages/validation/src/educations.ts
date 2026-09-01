import { z } from 'zod';

export const specializationsQuerySchema = z.object({
  educationId: z.coerce.number().int().positive(),
});

export const resolveEducationQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export type SpecializationsQuery = z.infer<typeof specializationsQuerySchema>;
export type ResolveEducationQuery = z.infer<typeof resolveEducationQuerySchema>;
