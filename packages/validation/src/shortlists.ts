import { z } from 'zod';

export const shortlistSchema = z.object({
  targetProfileId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
}).refine(data => data.targetProfileId || data.profileId, {
  message: "At least one target identifier (targetProfileId or profileId) must be provided",
});

export type ShortlistInput = z.infer<typeof shortlistSchema>;
