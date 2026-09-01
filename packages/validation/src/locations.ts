import { z } from 'zod';

export const cityAutocompleteQuerySchema = z.object({
  q: z.string().trim().min(2, 'Enter at least 2 characters.').max(100),
  state: z.string().trim().min(2).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export const resolveCityQuerySchema = z.object({
  q: z.string().trim().min(2, 'Enter at least 2 characters.').max(100),
});

export type CityAutocompleteQuery = z.infer<typeof cityAutocompleteQuerySchema>;
export type ResolveCityQuery = z.infer<typeof resolveCityQuerySchema>;
