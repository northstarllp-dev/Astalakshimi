import { NotFoundException } from '@nestjs/common';
import { SettingsService } from '../../src/settings/settings.service';

describe('Feature 12: Settings - SettingsService (Unit Tests)', () => {
  let settingsService: SettingsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };
    settingsService = new SettingsService(mockDb);
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
      mockDb.select = mockQueryBuilder([[]]); // none found
      mockDb.insert = mockQueryBuilder([[defaultSettings]]); // create

      const result = await settingsService.getSettings('u1');
      expect(result).toEqual(defaultSettings);
    });
  });

  describe('updateSettings', () => {
    it('should update and return settings', async () => {
      const updatedSettings = { userId: 'u1', photoBlur: 'always' };
      mockDb.update = mockQueryBuilder([[updatedSettings]]);

      const result = await settingsService.updateSettings('u1', { photoBlur: 'always' });
      expect(result).toEqual(updatedSettings);
    });

    it('should throw NotFoundException if update fails (settings missing)', async () => {
      mockDb.update = mockQueryBuilder([[]]);

      await expect(settingsService.updateSettings('u1', { photoBlur: 'always' })).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
