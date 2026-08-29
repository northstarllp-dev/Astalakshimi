import { sendMessageSchema } from '@astalakshimi/validation';

describe('Feature 5: Chat - Zod Validation Schemas', () => {
  describe('sendMessageSchema', () => {
    it('should accept valid message text', () => {
      const payload = {
        text: 'Hello! How are you doing today?',
      };

      const result = sendMessageSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept message with optional valid receiverProfileId UUID', () => {
      const payload = {
        text: 'Let us connect and discuss our horoscopes.',
        receiverProfileId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = sendMessageSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject empty message text', () => {
      const payload = {
        text: '',
      };

      const result = sendMessageSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Message text cannot be empty');
      }
    });

    it('should reject non-UUID string for receiverProfileId', () => {
      const payload = {
        text: 'Valid text',
        receiverProfileId: 'invalid-id-123',
      };

      const result = sendMessageSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject messages exceeding 2000 characters', () => {
      const payload = {
        text: 'a'.repeat(2001),
      };

      const result = sendMessageSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
