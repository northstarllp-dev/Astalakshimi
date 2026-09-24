import { NotFoundException, BadRequestException } from '@nestjs/common';
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
      deleteObject: jest.fn(),
      putObject: jest.fn(),
      getAdminSignedViewUrl: jest.fn(),
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

  describe('uploadFileBuffer', () => {
    it('should reject a profile photo that is already on the profile', async () => {
      mockDb.select = mockQueryBuilder([
        [{ id: 'prof-1' }],
        [{ id: 'photo-1' }],
      ]);

      await expect(
        mediaService.uploadFileBuffer('user-1', Buffer.from('same-bytes'), {
          purpose: 'profile_photo',
          contentType: 'image/jpeg',
          fileSize: 10,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockS3Provider.putObject).not.toHaveBeenCalled();
    });

    it('stores a captured selfie in the vault bucket', async () => {
      const buffer = Buffer.from('selfie-jpeg');
      mockS3Provider.generateUploadUrl.mockResolvedValue({
        s3Key: 'verifications/user-1/selfie-1.jpg',
        bucket: 'vault-bucket',
      });

      const result = await mediaService.uploadFileBuffer('user-1', buffer, {
        purpose: 'selfie',
        contentType: 'image/jpeg',
        fileSize: buffer.length,
      });

      expect(result.s3Key).toBe('verifications/user-1/selfie-1.jpg');
      expect(result.bucket).toBe('vault-bucket');
      expect(mockS3Provider.putObject).toHaveBeenCalledWith(
        'verifications/user-1/selfie-1.jpg',
        buffer,
        'image/jpeg',
        'vault-bucket',
      );
    });

    it('stores a government ID of any type in the vault bucket', async () => {
      const buffer = Buffer.from('%PDF-1.4');
      mockS3Provider.generateUploadUrl.mockResolvedValue({
        s3Key: 'verifications/user-1/govt-id-1.pdf',
        bucket: 'vault-bucket',
      });

      await mediaService.uploadFileBuffer('user-1', buffer, {
        purpose: 'govt_id',
        contentType: 'application/pdf',
        fileSize: buffer.length,
      });

      expect(mockS3Provider.putObject).toHaveBeenCalledWith(
        'verifications/user-1/govt-id-1.pdf',
        buffer,
        'application/pdf',
        'vault-bucket',
      );
    });

    it('stores a horoscope PDF in the media bucket', async () => {
      const buffer = Buffer.from('%PDF-horoscope');
      mockS3Provider.generateUploadUrl.mockResolvedValue({
        s3Key: 'profiles/user-1/horoscopes/h.pdf',
        bucket: 'media-bucket',
      });

      const result = await mediaService.uploadFileBuffer('user-1', buffer, {
        purpose: 'horoscope',
        contentType: 'application/pdf',
        fileSize: buffer.length,
      });

      expect(result.bucket).toBe('media-bucket');
      expect(mockS3Provider.putObject).toHaveBeenCalledWith(
        'profiles/user-1/horoscopes/h.pdf',
        buffer,
        'application/pdf',
        'media-bucket',
      );
    });
  });

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

      const userId = '11111111-1111-4111-8111-111111111111';
      const s3Key = `profiles/${userId}/photos/22222222-2222-4222-8222-222222222222.jpeg`;
      const result = await mediaService.confirmPhoto(userId, { s3Key, isPrimary: false, displayOrder: 0 });
      expect(result.success).toBe(true);
      expect(result.photo.id).toBe('photo-1');
    });

    it('should reset other primary photos if isPrimary is true', async () => {
      mockDb.select = mockQueryBuilder([[{ id: 'prof-1' }]]);
      mockDb.insert = mockQueryBuilder([[{ id: 'photo-1' }]]);
      mockDb.update = mockQueryBuilder([[]]);

      const userId = '11111111-1111-4111-8111-111111111111';
      const s3Key = `profiles/${userId}/photos/22222222-2222-4222-8222-222222222222.jpeg`;
      await mediaService.confirmPhoto(userId, { s3Key, isPrimary: true, displayOrder: 0 });
      expect(mockDb.update).toHaveBeenCalled(); // verified it cleared old primary
    });
  });

  describe('confirmVerification', () => {
    it('should save verification request', async () => {
      mockDb.select = mockQueryBuilder([
        [
          {
            id: 'prof-1',
            profileFor: 'Myself',
            fullName: 'Test User',
            gender: 'Male',
            dob: '2000-01-01',
            maritalStatus: 'Never Married',
            city: 'Mumbai',
            heightCm: 170,
            religion: 'Hindu',
            caste: 'Brahmin',
            motherTongue: 'Hindi',
            educationLevel: 'Bachelors',
            employmentStatus: 'Employed',
            annualIncome: '5-10',
          },
        ],
        [{ diet: 'Vegetarian' }],
        [{ star: 'Mula', rashi: 'Dhanu', manglik: 'No', birthTime: '01:15', birthPlace: 'Chennai' }],
        [{ id: 'photo-1' }],
      ]);
      mockDb.insert = mockQueryBuilder([[{ id: 'ver-1' }]]);

      const result = await mediaService.confirmVerification('user-1', {
        method: 'selfie',
        selfieS3Key: 'verifications/user-1_selfie.jpg',
        govtIdType: 'PAN card',
        govtIdS3Key: 'verifications/user-1_pan.pdf',
      });
      expect(result.success).toBe(true);
      expect(result.verification.id).toBe('ver-1');
    });

    it('should reject verification when either the selfie or the government ID is missing', async () => {
      mockDb.select = mockQueryBuilder([
        [
          {
            id: 'prof-1',
            profileFor: 'Myself',
            fullName: 'Test User',
            gender: 'Male',
            dob: '2000-01-01',
            maritalStatus: 'Never Married',
            city: 'Mumbai',
            heightCm: 170,
            religion: 'Hindu',
            caste: 'Brahmin',
            motherTongue: 'Hindi',
            educationLevel: 'Bachelors',
            employmentStatus: 'Employed',
            annualIncome: '5-10',
          },
        ],
        [{ diet: 'Vegetarian' }],
        [{ star: 'Mula', rashi: 'Dhanu', manglik: 'No', birthTime: '01:15', birthPlace: 'Chennai' }],
        [{ id: 'photo-1' }],
        [],
      ]);

      await expect(
        mediaService.confirmVerification('user-1', { method: 'selfie', selfieS3Key: 'verifications/user-1_selfie.jpg' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmHoroscope', () => {
    it('should save horoscope details', async () => {
      mockDb.select = mockQueryBuilder([[{ id: 'prof-1' }]]);
      mockDb.insert = mockQueryBuilder([[{ id: 'horo-1' }]]);

      const userId = '11111111-1111-4111-8111-111111111111';
      const horoscopeS3Key = `profiles/${userId}/horoscopes/33333333-3333-4333-8333-333333333333.pdf`;
      const result = await mediaService.confirmHoroscope(userId, { horoscopeS3Key, fileName: 'test.pdf', fileSizeBytes: 100 });
      expect(result.success).toBe(true);
      expect(result.horoscope.id).toBe('horo-1');
    });
  });

  describe('getHoroscopeDownloadUrl', () => {
    it('returns a signed download URL for the saved horoscope', async () => {
      mockDb.select = mockQueryBuilder([
        [{ id: 'prof-1' }],
        [{ horoscopeS3Key: 'profiles/user-1/horoscopes/h.pdf', horoscopeFileName: 'chart.pdf' }],
      ]);
      mockS3Provider.getAdminSignedViewUrl.mockResolvedValue('https://signed.example/chart.pdf');

      const result = await mediaService.getHoroscopeDownloadUrl('user-1');

      expect(mockS3Provider.getAdminSignedViewUrl).toHaveBeenCalledWith(
        'profiles/user-1/horoscopes/h.pdf',
        true,
      );
      expect(result).toEqual({
        url: 'https://signed.example/chart.pdf',
        fileName: 'chart.pdf',
      });
    });

    it('rejects a download when no horoscope has been uploaded', async () => {
      mockDb.select = mockQueryBuilder([[{ id: 'prof-1' }], []]);

      await expect(mediaService.getHoroscopeDownloadUrl('user-1')).rejects.toThrow(NotFoundException);
      expect(mockS3Provider.getAdminSignedViewUrl).not.toHaveBeenCalled();
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
