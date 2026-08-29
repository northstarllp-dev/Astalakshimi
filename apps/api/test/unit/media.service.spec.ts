import { NotFoundException } from '@nestjs/common';
import { MediaService } from '../../src/media/media.service';

describe('MediaService (Unit Tests)', () => {
  let mediaService: MediaService;
  let mockDb: any;
  let mockS3Provider: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockS3Provider = {
      generateUploadUrl: jest.fn(),
      getSignedMediaUrl: jest.fn(),
      deleteObject: jest.fn(),
    };

    mediaService = new MediaService(mockDb, mockS3Provider);
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

  describe('getUploadUrl', () => {
    it('should call S3Provider and return url', async () => {
      const mockResult = { url: 'https://s3.amazonaws.com/test', key: 'test.jpg' };
      mockS3Provider.generateUploadUrl.mockResolvedValue(mockResult);

      const result = await mediaService.getUploadUrl('user-1', {
        purpose: 'profile_photo',
        contentType: 'image/jpeg',
        fileSize: 1024,
      });

      expect(result).toEqual(mockResult);
      expect(mockS3Provider.generateUploadUrl).toHaveBeenCalledWith('user-1', 'profile_photo', 'image/jpeg', 1024);
    });
  });

  describe('getSignedMediaUrl', () => {
    it('should delegate to S3Provider', async () => {
      mockS3Provider.getSignedMediaUrl.mockResolvedValue('https://signed.url');
      const result = await mediaService.getSignedMediaUrl('test.jpg');
      expect(result).toBe('https://signed.url');
    });
  });

  describe('confirmPhoto', () => {
    it('should throw NotFoundException if profile not found', async () => {
      mockDb.select = mockQueryBuilder([[]]);

      await expect(mediaService.confirmPhoto('user-1', { s3Key: 'key.jpg', isPrimary: false, displayOrder: 0 })).rejects.toThrow(
        NotFoundException
      );
    });

    it('should save photo successfully', async () => {
      mockDb.select = mockQueryBuilder([[{ id: 'prof-1' }]]);
      mockDb.insert = mockQueryBuilder([[{ id: 'photo-1' }]]);
      
      const result = await mediaService.confirmPhoto('user-1', { s3Key: 'key.jpg', isPrimary: false, displayOrder: 0 });
      expect(result.success).toBe(true);
      expect(result.photo.id).toBe('photo-1');
    });

    it('should reset other primary photos if isPrimary is true', async () => {
      mockDb.select = mockQueryBuilder([[{ id: 'prof-1' }]]);
      mockDb.insert = mockQueryBuilder([[{ id: 'photo-1' }]]);
      mockDb.update = mockQueryBuilder([[]]);
      
      await mediaService.confirmPhoto('user-1', { s3Key: 'key.jpg', isPrimary: true, displayOrder: 0 });
      expect(mockDb.update).toHaveBeenCalled(); // verified it cleared old primary
    });
  });

  describe('confirmVerification', () => {
    it('should save verification request', async () => {
      mockDb.select = mockQueryBuilder([[{ id: 'prof-1' }]]);
      mockDb.insert = mockQueryBuilder([[{ id: 'ver-1' }]]);
      
      const result = await mediaService.confirmVerification('user-1', { method: 'govt_id' });
      expect(result.success).toBe(true);
      expect(result.verification.id).toBe('ver-1');
    });
  });

  describe('confirmHoroscope', () => {
    it('should save horoscope details', async () => {
      mockDb.select = mockQueryBuilder([[{ id: 'prof-1' }]]);
      mockDb.insert = mockQueryBuilder([[{ id: 'horo-1' }]]);
      
      const result = await mediaService.confirmHoroscope('user-1', { horoscopeS3Key: 'horo.pdf', fileName: 'test.pdf', fileSizeBytes: 100 });
      expect(result.success).toBe(true);
      expect(result.horoscope.id).toBe('horo-1');
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo from DB and S3', async () => {
      mockDb.select = mockQueryBuilder([
        [{ id: 'prof-1' }], // profile
        [{ id: 'photo-1', s3Key: 'test.jpg' }] // photo
      ]);
      mockDb.delete = mockQueryBuilder([[]]);

      const result = await mediaService.deletePhoto('user-1', 'photo-1');
      expect(result.success).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockS3Provider.deleteObject).toHaveBeenCalledWith('test.jpg', false);
    });
  });
});
