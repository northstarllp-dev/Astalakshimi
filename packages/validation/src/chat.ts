import { z } from 'zod';

export const sendMessageSchema = z.object({
  text: z.string().min(1, 'Message text cannot be empty').max(2000),
  receiverProfileId: z.string().uuid().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
