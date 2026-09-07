import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from '../../src/media/media.controller';
import { MediaService } from '../../src/media/media.service';
import type { UserSession } from '@astalakshimi/types';

describe('MediaController (Integration Tests)', () => {
  let controller: MediaController;
  let mediaService: jest.Mocked<MediaService>;

  const mockUserSession: UserSession = {
    userId: 'user-uuid-1',
    phone: '9876543210',
    role: 'member',
  };

  beforeEach(async () => {
    const mockMediaService = {
      getUploadUrl: jest.fn(),
      confirmPhoto: jest.fn(),
      confirmVerification: jest.fn(),
      confirmHoroscope: jest.fn(),
      deletePhoto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    mediaService = module.get(MediaService);
  });

  describe('POST /media/upload-url', () => {
    it('should delegate to service.getUploadUrl', async () => {
      const mockResponse = { url: 'url', key: 'key' };
      mediaService.getUploadUrl.mockResolvedValue(mockResponse as any);

      const result = await controller.getUploadUrl(mockUserSession, { purpose: 'profile_photo', contentType: 'image/jpeg', fileSize: 1024 });

      expect(mediaService.getUploadUrl).toHaveBeenCalledWith(mockUserSession.userId, expect.any(Object));
      expect(result).toEqual(mockResponse);
    });
  });

  describe('POST /media/confirm-photo', () => {
    it('should delegate to service.confirmPhoto', async () => {
      mediaService.confirmPhoto.mockResolvedValue({ success: true, photo: {} as any });
      const result = await controller.confirmPhoto(mockUserSession, { s3Key: 'key', isPrimary: false, displayOrder: 0 });
      expect(mediaService.confirmPhoto).toHaveBeenCalledWith(mockUserSession.userId, { s3Key: 'key', isPrimary: false, displayOrder: 0 });
      expect(result.success).toBe(true);
    });
  });

  describe('DELETE /media/photos/:id', () => {
    it('should delegate to service.deletePhoto', async () => {
      mediaService.deletePhoto.mockResolvedValue({ success: true, message: 'ok' });
      const result = await controller.deletePhoto(mockUserSession, 'photo-1');
      expect(mediaService.deletePhoto).toHaveBeenCalledWith(mockUserSession.userId, 'photo-1');
      expect(result.success).toBe(true);
    });
  });
});
