import { Test, TestingModule } from '@nestjs/testing';
import { ShortlistsController } from '../../src/shortlists/shortlists.controller';
import { ShortlistsService } from '../../src/shortlists/shortlists.service';
import type { UserSession } from '@astalakshimi/types';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe';
import { shortlistSchema } from '@astalakshimi/validation';

describe('Feature 7: Shortlisting - ShortlistsController (Integration Tests)', () => {
  let controller: ShortlistsController;
  let shortlistsService: jest.Mocked<ShortlistsService>;

  const mockUserSession: UserSession = {
    userId: 'user-uuid-1',
    phone: '9876543210',
    role: 'member',
  };

  beforeEach(async () => {
    const mockShortlistsService = {
      getShortlists: jest.fn(),
      getShortlistIds: jest.fn(),
      addShortlist: jest.fn(),
      removeShortlist: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShortlistsController],
      providers: [
        {
          provide: ShortlistsService,
          useValue: mockShortlistsService,
        },
      ],
    }).compile();

    controller = module.get<ShortlistsController>(ShortlistsController);
    shortlistsService = module.get(ShortlistsService);
  });

  describe('GET /shortlists', () => {
    it('should delegate to service.getShortlists', async () => {
      const mockResponse = [{ id: 'target-1' }];
      shortlistsService.getShortlists.mockResolvedValue(mockResponse as any);

      const result = await controller.getShortlists(mockUserSession);

      expect(shortlistsService.getShortlists).toHaveBeenCalledWith(mockUserSession.userId);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('GET /shortlists/ids', () => {
    it('should delegate to service.getShortlistIds', async () => {
      const mockResponse = ['target-1'];
      shortlistsService.getShortlistIds.mockResolvedValue(mockResponse);

      const result = await controller.getShortlistIds(mockUserSession);

      expect(shortlistsService.getShortlistIds).toHaveBeenCalledWith(mockUserSession.userId);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('POST /shortlists', () => {
    it('should delegate to service.addShortlist using targetProfileId', async () => {
      const mockResponse = { id: 'sl-1', profileId: 'curr', targetProfileId: 'target-1' };
      shortlistsService.addShortlist.mockResolvedValue(mockResponse as any);

      const body = { targetProfileId: 'target-1' };
      const result = await controller.addShortlist(mockUserSession, body);

      expect(shortlistsService.addShortlist).toHaveBeenCalledWith(mockUserSession.userId, 'target-1');
      expect(result).toEqual(mockResponse);
    });

    it('should delegate to service.addShortlist using profileId (fallback)', async () => {
      const mockResponse = { id: 'sl-1', profileId: 'curr', targetProfileId: 'target-1' };
      shortlistsService.addShortlist.mockResolvedValue(mockResponse as any);

      const body = { profileId: 'target-1' };
      const result = await controller.addShortlist(mockUserSession, body as any);

      expect(shortlistsService.addShortlist).toHaveBeenCalledWith(mockUserSession.userId, 'target-1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('DELETE /shortlists/:targetProfileId', () => {
    it('should delegate to service.removeShortlist', async () => {
      const mockResponse = { success: true };
      shortlistsService.removeShortlist.mockResolvedValue(mockResponse);

      const result = await controller.removeShortlist(mockUserSession, 'target-1');

      expect(shortlistsService.removeShortlist).toHaveBeenCalledWith(mockUserSession.userId, 'target-1');
      expect(result).toEqual(mockResponse);
    });
  });
});
