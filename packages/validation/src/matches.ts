import { z } from 'zod';

// Pagination for the score-ranked "Your Top Matches" list. The ranked pool is
// computed in Node (bounded by POOL_LIMIT), so page/limit stay small.
export const matchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type MatchesQuery = z.infer<typeof matchesQuerySchema>;
