import { NotFoundException } from '@nestjs/common';
import { PreferencesService } from '../../src/preferences/preferences.service';

describe('Feature 13: Partner Preferences - PreferencesService (Unit Tests)', () => {
  let preferencesService: PreferencesService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
    };
    preferencesService = new PreferencesService(mockDb);
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
        values: jest.fn().mockReturnThis(),
        onConflictDoUpdate: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve(resolveValues[currentCall - 1] || [])),
      };
    });
  };

  describe('getMyPreferences', () => {
    it('should throw NotFoundException if profile missing', async () => {
      mockDb.select = mockQueryBuilder([[]]); // no profile

      await expect(preferencesService.getMyPreferences('user-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException if preferences not set', async () => {
      mockDb.select = mockQueryBuilder([[{ id: 'prof-1' }], []]); // profile found, no prefs

      await expect(preferencesService.getMyPreferences('user-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return preferences if found', async () => {
      const mockPrefs = { id: 'pref-1', prefAgeMin: 25 };
      mockDb.select = mockQueryBuilder([[{ id: 'prof-1' }], [mockPrefs]]);

      const result = await preferencesService.getMyPreferences('user-1');
      expect(result).toEqual(mockPrefs);
    });
  });

  describe('updateMyPreferences', () => {
    it('should throw NotFoundException if profile missing', async () => {
      mockDb.select = mockQueryBuilder([[]]); // no profile

      await expect(
        preferencesService.updateMyPreferences('user-1', { prefAgeMin: 25 } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('should upsert and return updated preferences', async () => {
      mockDb.select = mockQueryBuilder([[{ id: 'prof-1' }]]);
      const mockUpdated = { id: 'pref-1', prefAgeMin: 25 };
      mockDb.insert = mockQueryBuilder([[mockUpdated]]);

      const result = await preferencesService.updateMyPreferences('user-1', {
        prefAgeMin: 25,
      } as any);

      expect(result).toEqual(mockUpdated);
    });
  });
});
