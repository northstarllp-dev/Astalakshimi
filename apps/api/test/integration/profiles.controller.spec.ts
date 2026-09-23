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

    it('should forward the full partner-preference set to the service', async () => {
      const payload = {
        profileFor: 'Myself',
        fullName: 'Fathima Rahman',
        prefAgeMin: 30,
        prefAgeMax: 40,
        prefReligions: ['Muslim'],
        prefMaritalStatuses: ['Never Married', 'Divorced'],
        prefCastes: ['Sunni'],
        prefMotherTongues: ['Urdu'],
        prefMinEducation: 'Masters',
        prefLocations: ['Hyderabad'],
      } as unknown as CompleteRegistrationPayload;

      profilesService.completeRegistration.mockResolvedValue({
        success: true,
        message: 'Done',
        profileId: 'prof-1',
      });

      await controller.completeRegistration(mockUserSession, payload);

      expect(profilesService.completeRegistration).toHaveBeenCalledWith(
        mockUserSession.userId,
        expect.objectContaining({
          prefAgeMin: 30,
          prefAgeMax: 40,
          prefReligions: ['Muslim'],
          prefMaritalStatuses: ['Never Married', 'Divorced'],
          prefCastes: ['Sunni'],
          prefMotherTongues: ['Urdu'],
          prefMinEducation: 'Masters',
          prefLocations: ['Hyderabad'],
        }),
      );
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

    it('should forward preference + DOB fields to the service', async () => {
      const payload = {
        gender: 'Female' as const,
        dobDay: '12',
        dobMonth: '03',
        dobYear: '1996',
        prefAgeMin: 24,
        prefReligions: ['Hindu'],
      };
      profilesService.updateMyProfile.mockResolvedValue({
        profile: { id: 'prof-1' },
        photos: [],
        verificationStatus: 'idle',
      } as any);

      await controller.updateMyProfile(mockUserSession, payload as any);

      expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
        mockUserSession.userId,
        payload,
      );
    });

    it('should forward maritalStatus + children fields to the service', async () => {
      const payload = {
        maritalStatus: 'Divorced' as const,
        hasChildren: true,
        childrenCount: 2,
        childrenLivingWithMe: false,
      };
      profilesService.updateMyProfile.mockResolvedValue({
        profile: { id: 'prof-1', ...payload },
        photos: [],
        verificationStatus: 'idle',
      } as any);

      await controller.updateMyProfile(mockUserSession, payload as any);

      expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
        mockUserSession.userId,
        payload,
      );
    });

    it('should forward identity basics and round-trip via getMyProfile shape', async () => {
      const payload = {
        profileFor: 'Son' as const,
        fullName: 'Arjun Kumar',
        gender: 'Male' as const,
        dobDay: '10',
        dobMonth: '08',
        dobYear: '1994',
      };
      const expected = {
        profile: {
          id: 'prof-1',
          profileFor: 'Son',
          fullName: 'Arjun Kumar',
          gender: 'Male',
          dob: '1994-08-10',
          createdBy: 'self',
        },
        photos: [],
        verificationStatus: 'idle',
      } as unknown as FullProfileView;

      profilesService.updateMyProfile.mockResolvedValue(expected);

      const result = await controller.updateMyProfile(mockUserSession, payload as any);

      expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
        mockUserSession.userId,
        payload,
      );
      expect(result.profile.profileFor).toBe('Son');
      expect(result.profile.fullName).toBe('Arjun Kumar');
      expect(result.profile.gender).toBe('Male');
      expect(result.profile.dob).toBe('1994-08-10');
    });

    it('should forward family details fields to the service', async () => {
      const payload = {
        familyType: 'Extended' as const,
        familyValues: 'Traditional' as const,
        familyStatus: 'Upper middle class',
        fatherOccupation: 'Retired' as const,
        motherOccupation: 'Homemaker' as const,
        brothersCount: 1,
        sistersCount: 2,
      };
      const expected = {
        profile: { id: 'prof-1' },
        family: { ...payload },
        photos: [],
        verificationStatus: 'idle',
      } as unknown as FullProfileView;

      profilesService.updateMyProfile.mockResolvedValue(expected);

      const result = await controller.updateMyProfile(mockUserSession, payload as any);

      expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
        mockUserSession.userId,
        payload,
      );
      expect(result.family).toEqual(expect.objectContaining(payload));
    });
  });

  describe('Photo Endpoints (POST, DELETE, PUT)', () => {
    it('should add a photo for the current user', async () => {
      const expected = { profile: {}, photos: [] } as unknown as FullProfileView;
      profilesService.addPhoto.mockResolvedValue(expected);

      const result = await controller.addPhoto(mockUserSession, { s3Key: 'photo.jpg' });

      expect(profilesService.addPhoto).toHaveBeenCalledWith(
        mockUserSession.userId,
        'photo.jpg',
        undefined,
      );
      expect(result).toEqual(expected);
    });

    it('should delete a photo by ID', async () => {
      const expected = {
        profile: {},
        photos: [{ id: 'photo-2', s3Key: 'a.jpg', isPrimary: true }],
      } as unknown as FullProfileView;
      profilesService.deletePhoto.mockResolvedValue(expected);

      const result = await controller.deletePhoto(mockUserSession, 'photo-uuid-1');

      expect(profilesService.deletePhoto).toHaveBeenCalledWith(
        mockUserSession.userId,
        'photo-uuid-1'
      );
      expect(result).toEqual(expected);
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
  });

  describe('route security metadata', () => {
    it('requires auth on profile views and allowlists only onboarding routes', async () => {
      const { Reflector } = await import('@nestjs/core');
      const { IS_PUBLIC_KEY } = await import(
        '../../src/common/decorators/public.decorator'
      );
      const { ALLOW_INCOMPLETE_KEY } = await import(
        '../../src/common/decorators/allow-incomplete.decorator'
      );
      const reflector = new Reflector();
      const proto = ProfilesController.prototype as any;

      // Anonymous browse is removed: every viewer must be authenticated.
      expect(
        reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
          proto['getProfileById'],
          ProfilesController,
        ]),
      ).toBeFalsy();

      // Onboarding routes stay reachable for JWT holders without a profile.
      for (const method of ['completeRegistration', 'getMyProfile']) {
        expect(
          reflector.getAllAndOverride<boolean>(ALLOW_INCOMPLETE_KEY, [
            proto[method],
            ProfilesController,
          ]),
        ).toBe(true);
      }

      // Everything else needs a finished profile.
      for (const method of [
        'updateMyProfile',
        'addPhoto',
        'deletePhoto',
        'reorderPhotos',
        'getProfileById',
        'recordVisit',
      ]) {
        expect(
          reflector.getAllAndOverride<boolean>(ALLOW_INCOMPLETE_KEY, [
            proto[method],
            ProfilesController,
          ]),
        ).toBeFalsy();
      }
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
