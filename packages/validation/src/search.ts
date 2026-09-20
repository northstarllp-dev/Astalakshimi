import { z } from 'zod';

// At most one of pageSize/limit; bounded to prevent expensive queries.
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100).optional(),
  ageMin: z.coerce.number().int().min(18).max(100).optional(),
  ageMax: z.coerce.number().int().min(18).max(100).optional(),
  city: z.string().min(1).max(100).optional(),
  community: z.string().min(1).max(100).optional(),
  // The Discover UI sends its browse tab id ('all' by default); 'new' keeps
  // SQL recency ordering, everything else falls back to match-score ranking.
  tab: z.enum(['all', 'new', 'nearby', 'premium', 'verified', 'active']).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  advanced: z.string().optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
