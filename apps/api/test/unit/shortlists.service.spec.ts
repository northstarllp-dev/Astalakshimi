import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ShortlistsService } from '../../src/shortlists/shortlists.service';

describe('Feature 7: Shortlisting - ShortlistsService (Unit Tests)', () => {
  let shortlistsService: ShortlistsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
    };
    shortlistsService = new ShortlistsService(mockDb);
  });

  const mockQueryBuilder = (resolveValues: any[]) => {
    let callCount = 0;
    return jest.fn(() => {
      callCount++;
      const currentCall = callCount;
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => {
          resolve(resolveValues[currentCall - 1] || []);
        }),
      };
    });
  };

  describe('getProfileId helper', () => {
    it('should throw NotFoundException if profile not found', async () => {
      mockDb.select = mockQueryBuilder([[]]); // No profile returned

      await expect(shortlistsService.getShortlists('user-uuid-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getShortlists', () => {
    it('should return empty array if user has no shortlists', async () => {
      mockDb.select = mockQueryBuilder([
        [{ id: 'prof-curr' }], // Profile exists
        [], // No shortlists
      ]);

      const result = await shortlistsService.getShortlists('user-uuid-1');
      expect(result).toEqual([]);
    });

    it('should return populated shortlists with photos mapped', async () => {
      const mockShortlists = [
        {
          id: 'sl-1',
          targetProfileId: 'prof-target',
          createdAt: new Date(),
          targetProfile: {
            id: 'prof-target',
            fullName: 'Target User',
            dob: '1995-05-15',
          },
        },
      ];
      const mockPhotos = [{ profileId: 'prof-target', s3Key: 'photo-url.jpg' }];

      mockDb.select = mockQueryBuilder([
        [{ id: 'prof-curr' }], // getProfileId
        mockShortlists, // userShortlists query
        mockPhotos, // photos query
      ]);

      const result = await shortlistsService.getShortlists('user-uuid-1');

      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe('Target User');
      expect(result[0].photos).toEqual(['photo-url.jpg']);
      // 2026 - 1995 = ~31
      expect(result[0].age).toBeGreaterThanOrEqual(30); 
    });
  });

  describe('getShortlistIds', () => {
    it('should return array of target profile IDs', async () => {
      mockDb.select = mockQueryBuilder([
        [{ id: 'prof-curr' }], // getProfileId
        [{ targetProfileId: 'target-1' }, { targetProfileId: 'target-2' }],
      ]);

      const result = await shortlistsService.getShortlistIds('user-uuid-1');
      expect(result).toEqual(['target-1', 'target-2']);
    });
  });

  describe('addShortlist', () => {
    it('should throw BadRequestException if user tries to shortlist themselves', async () => {
      mockDb.select = mockQueryBuilder([
        [{ id: 'prof-curr' }], // getProfileId
      ]);

      await expect(
        shortlistsService.addShortlist('user-uuid-1', 'prof-curr')
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing shortlist if already shortlisted', async () => {
      const existingShortlist = { id: 'existing-sl' };
      mockDb.select = mockQueryBuilder([
        [{ id: 'prof-curr' }], // getProfileId
        [existingShortlist], // Check existing
      ]);

      const result = await shortlistsService.addShortlist('user-uuid-1', 'prof-target');
      expect(result).toEqual(existingShortlist);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should insert and return new shortlist', async () => {
      const newShortlist = { id: 'new-sl', profileId: 'prof-curr', targetProfileId: 'prof-target' };
      mockDb.select = mockQueryBuilder([
        [{ id: 'prof-curr' }], // getProfileId
        [], // Check existing -> not found
      ]);

      mockDb.insert = mockQueryBuilder([[newShortlist]]); // returning newShortlist

      const result = await shortlistsService.addShortlist('user-uuid-1', 'prof-target');
      expect(result).toEqual(newShortlist);
    });
  });

  describe('removeShortlist', () => {
    it('should delete the shortlist and return success', async () => {
      mockDb.select = mockQueryBuilder([
        [{ id: 'prof-curr' }], // getProfileId
      ]);

      // Simple mock for delete query builder
      mockDb.delete = jest.fn(() => ({
        where: jest.fn().mockResolvedValue(true),
      }));

      const result = await shortlistsService.removeShortlist('user-uuid-1', 'prof-target');
      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
