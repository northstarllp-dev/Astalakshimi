import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesController } from '../../src/profiles/profiles.controller';
import { ProfilesService } from '../../src/profiles/profiles.service';
import type { UserSession, CompleteRegistrationPayload, FullProfileView } from '@astalakshimi/types';

describe('Feature 2: Profiles - ProfilesController (Integration Tests)', () => {
  let controller: ProfilesController;
  let profilesService: jest.Mocked<ProfilesService>;

  const mockUserSession: UserSession = {
    userId: 'user-uuid-1',
    phone: '9876543210',
    role: 'member',
  };

  beforeEach(async () => {
    const mockProfilesService = {
      completeRegistration: jest.fn(),
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
      addPhoto: jest.fn(),
      deletePhoto: jest.fn(),
      reorderPhotos: jest.fn(),
      getProfileById: jest.fn(),
      recordVisit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
      ],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
    profilesService = module.get(ProfilesService);
  });

  describe('POST /profiles/complete-registration', () => {
    it('should pass payload and user ID to service', async () => {
      const payload = { fullName: 'Karthik', gender: 'Male' } as CompleteRegistrationPayload;
      const expectedResponse = { success: true, message: 'Done', profileId: 'prof-1' };

      profilesService.completeRegistration.mockResolvedValue(expectedResponse);

      const result = await controller.completeRegistration(mockUserSession, payload);

      expect(profilesService.completeRegistration).toHaveBeenCalledWith(
        mockUserSession.userId,
        payload
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /profiles/me', () => {
    it('should return current user profile', async () => {
      const expectedProfile = {
        profile: { id: 'prof-1', fullName: 'Karthik' },
        photos: [],
        verificationStatus: 'idle',
      } as unknown as FullProfileView;

      profilesService.getMyProfile.mockResolvedValue(expectedProfile);

      const result = await controller.getMyProfile(mockUserSession);

      expect(profilesService.getMyProfile).toHaveBeenCalledWith(mockUserSession.userId);
      expect(result).toEqual(expectedProfile);
    });
  });

  describe('PATCH /profiles/me', () => {
    it('should update profile partially', async () => {
      const payload = { aboutMe: 'New Bio' };
      const expectedProfile = {
        profile: { id: 'prof-1', aboutMe: 'New Bio' },
        photos: [],
        verificationStatus: 'idle',
      } as unknown as FullProfileView;

      profilesService.updateMyProfile.mockResolvedValue(expectedProfile);

      const result = await controller.updateMyProfile(mockUserSession, payload);

      expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
        mockUserSession.userId,
        payload
      );
      expect(result).toEqual(expectedProfile);
    });
  });

  describe('Photo Endpoints (POST, DELETE, PUT)', () => {
    it('should add a photo for the current user', async () => {
      const expected = { profile: {}, photos: [] } as unknown as FullProfileView;
      profilesService.addPhoto.mockResolvedValue(expected);

      const result = await controller.addPhoto(mockUserSession, { s3Key: 'photo.jpg' });

      expect(profilesService.addPhoto).toHaveBeenCalledWith(mockUserSession.userId, 'photo.jpg');
      expect(result).toEqual(expected);
    });

    it('should delete a photo by ID', async () => {
      profilesService.deletePhoto.mockResolvedValue({ success: true });

      const result = await controller.deletePhoto(mockUserSession, 'photo-uuid-1');

      expect(profilesService.deletePhoto).toHaveBeenCalledWith(
        mockUserSession.userId,
        'photo-uuid-1'
      );
      expect(result).toEqual({ success: true });
    });

    it('should reorder photos according to provided array of IDs', async () => {
      const expected = { profile: {}, photos: [] } as unknown as FullProfileView;
      profilesService.reorderPhotos.mockResolvedValue(expected);

      const result = await controller.reorderPhotos(mockUserSession, {
        photoIds: ['photo-2', 'photo-1'],
      });

      expect(profilesService.reorderPhotos).toHaveBeenCalledWith(mockUserSession.userId, [
        'photo-2',
        'photo-1',
      ]);
      expect(result).toEqual(expected);
    });
  });

  describe('GET /profiles/:id', () => {
    it('should fetch target profile by ID and pass viewer userId when authenticated', async () => {
      const expected = { profile: { id: 'target-id' } } as unknown as FullProfileView;
      profilesService.getProfileById.mockResolvedValue(expected);

      const result = await controller.getProfileById('target-id', mockUserSession);

      expect(profilesService.getProfileById).toHaveBeenCalledWith(
        'target-id',
        mockUserSession.userId
      );
      expect(result).toEqual(expected);
    });

    it('should fetch target profile by ID without viewer when not authenticated', async () => {
      const expected = { profile: { id: 'target-id' } } as unknown as FullProfileView;
      profilesService.getProfileById.mockResolvedValue(expected);

      const result = await controller.getProfileById('target-id', null);

      expect(profilesService.getProfileById).toHaveBeenCalledWith('target-id', undefined);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /profiles/:id/visit', () => {
    it('should record visit and return success: true', async () => {
      profilesService.recordVisit.mockResolvedValue(undefined);

      const result = await controller.recordVisit('target-id', mockUserSession);

      expect(profilesService.recordVisit).toHaveBeenCalledWith(
        'target-id',
        mockUserSession.userId
      );
      expect(result).toEqual({ success: true });
    });
  });
});
