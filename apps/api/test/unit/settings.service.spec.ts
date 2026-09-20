import { NotFoundException } from '@nestjs/common';
import { SettingsService } from '../../src/settings/settings.service';

describe('SettingsService', () => {
  let settingsService: SettingsService;
  let mockDb: any;
  let mockProfiles: { invalidateProfileCacheForUser: jest.Mock };

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };
    mockProfiles = {
      invalidateProfileCacheForUser: jest.fn().mockResolvedValue(undefined),
    };
    settingsService = new SettingsService(mockDb, mockProfiles as any);
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
        set: jest.fn().mockReturnThis(),
        onConflictDoUpdate: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve(resolveValues[currentCall - 1] || [])),
      };
    });
  };

  describe('getSettings', () => {
    it('should return existing settings if found', async () => {
      const existingSettings = { userId: 'u1', photoBlur: 'never' };
      mockDb.select = mockQueryBuilder([[existingSettings]]);

      const result = await settingsService.getSettings('u1');
      expect(result).toEqual(existingSettings);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should create default settings if none exist', async () => {
      const defaultSettings = { userId: 'u1', photoBlur: 'always' };
      mockDb.select = mockQueryBuilder([[]]);
      mockDb.insert = mockQueryBuilder([[defaultSettings]]);

      const result = await settingsService.getSettings('u1');
      expect(result).toEqual(defaultSettings);
    });
  });

  describe('updateSettings', () => {
    it('should update settings and sync profiles.photoPrivacy', async () => {
      const updatedSettings = { userId: 'u1', photoBlur: 'never' };
      // 1st update: user_settings; 2nd update: profiles.photo_privacy
      mockDb.update = mockQueryBuilder([[updatedSettings], [{ id: 'p1' }]]);

      const result = await settingsService.updateSettings('u1', { photoBlur: 'never' });
      expect(result).toEqual(updatedSettings);
      expect(mockDb.update).toHaveBeenCalledTimes(2);
      expect(mockProfiles.invalidateProfileCacheForUser).toHaveBeenCalledWith('u1');
    });

    it('should create settings when update finds no row, then sync privacy', async () => {
      const created = { userId: 'u1', photoBlur: 'when_not_connected' };
      mockDb.update = mockQueryBuilder([[], [{ id: 'p1' }]]); // empty settings update, then profiles
      mockDb.insert = mockQueryBuilder([[created]]);

      const result = await settingsService.updateSettings('u1', { photoBlur: 'accepted' as any });
      expect(result.photoBlur).toBe('when_not_connected');
    });

    it('should throw NotFoundException if neither update nor insert returns a row', async () => {
      mockDb.update = mockQueryBuilder([[]]);
      mockDb.insert = mockQueryBuilder([[]]);

      await expect(settingsService.updateSettings('u1', { photoBlur: 'always' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
