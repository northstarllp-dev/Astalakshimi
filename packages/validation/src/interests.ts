import { z } from 'zod';

export const sendInterestSchema = z.object({
  targetProfileId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  message: z.string().max(500).optional(),
}).refine(data => data.targetProfileId || data.profileId || data.targetUserId, {
  message: "At least one target identifier (targetProfileId, profileId, or targetUserId) must be provided",
});

export type SendInterestInput = z.infer<typeof sendInterestSchema>;

export const updateInterestStatusSchema = z.object({
  status: z.enum(['accepted', 'declined', 'withdrawn']),
});

export type UpdateInterestStatusInput = z.infer<typeof updateInterestStatusSchema>;
