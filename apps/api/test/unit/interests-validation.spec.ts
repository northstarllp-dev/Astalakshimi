import { sendInterestSchema, updateInterestStatusSchema } from '@astalakshimi/validation';

describe('Feature 3: Interest System - Zod Validation Schemas', () => {
  describe('sendInterestSchema', () => {
    it('should accept valid targetProfileId with optional message', () => {
      const validPayload = {
        targetProfileId: '123e4567-e89b-12d3-a456-426614174000',
        message: 'Hello, I found your profile interesting!',
      };

      const result = sendInterestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept valid profileId as target identifier', () => {
      const validPayload = {
        profileId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = sendInterestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept valid targetUserId as target identifier', () => {
      const validPayload = {
        targetUserId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = sendInterestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject when no target identifier is provided', () => {
      const invalidPayload = {
        message: 'Hello!',
      };

      const result = sendInterestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'At least one target identifier'
        );
      }
    });

    it('should reject non-UUID string for targetProfileId', () => {
      const invalidPayload = {
        targetProfileId: 'invalid-non-uuid-string',
      };

      const result = sendInterestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject messages exceeding 500 characters', () => {
      const invalidPayload = {
        targetProfileId: '123e4567-e89b-12d3-a456-426614174000',
        message: 'a'.repeat(501),
      };

      const result = sendInterestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('updateInterestStatusSchema', () => {
    it('should accept "accepted", "declined", and "withdrawn"', () => {
      expect(updateInterestStatusSchema.safeParse({ status: 'accepted' }).success).toBe(true);
      expect(updateInterestStatusSchema.safeParse({ status: 'declined' }).success).toBe(true);
      expect(updateInterestStatusSchema.safeParse({ status: 'withdrawn' }).success).toBe(true);
    });

    it('should reject invalid status strings like "pending" or "blocked"', () => {
      expect(updateInterestStatusSchema.safeParse({ status: 'pending' }).success).toBe(false);
      expect(updateInterestStatusSchema.safeParse({ status: 'blocked' }).success).toBe(false);
      expect(updateInterestStatusSchema.safeParse({ status: 'random' }).success).toBe(false);
    });
  });
});
