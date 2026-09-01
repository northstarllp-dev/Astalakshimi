import { z } from 'zod';

export const communityAutocompleteQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  religion: z.string().trim().min(2).max(50),
  limit: z.coerce.number().int().min(1).max(25).default(12),
});

export const subcasteAutocompleteQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  communityId: z.coerce.number().int().positive().optional(),
  community: z.string().trim().min(2).max(100).optional(),
  religion: z.string().trim().min(2).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(25).default(12),
});

export const gotraAutocompleteQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  religion: z.string().trim().min(2).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(25).default(12),
});

export type CommunityAutocompleteQuery = z.infer<typeof communityAutocompleteQuerySchema>;
export type SubcasteAutocompleteQuery = z.infer<typeof subcasteAutocompleteQuerySchema>;
export type GotraAutocompleteQuery = z.infer<typeof gotraAutocompleteQuerySchema>;
