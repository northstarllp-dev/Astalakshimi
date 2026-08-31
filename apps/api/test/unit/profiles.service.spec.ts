import { NotFoundException } from '@nestjs/common';
import { ProfilesService } from '../../src/profiles/profiles.service';
import {
  profiles,
  familyDetails,
  lifestyleInterests,
  horoscopes,
  partnerPreferences,
  profilePhotos,
  verifications,
  userSettings,
  interests,
} from '@astalakshimi/database';
import type { CompleteRegistrationPayload } from '@astalakshimi/types';

describe('Feature 2: Profiles - ProfilesService (Unit Tests)', () => {
  let profilesService: ProfilesService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      transaction: jest.fn(async (cb: any) => cb(mockDb)),
    };

    const mockBlocks = { isBlocked: jest.fn().mockResolvedValue(false) };
    const mockEntitlements = {
      getContactUnlockStatus: jest.fn().mockResolvedValue({
        canView: false,
        isUnlocked: false,
        isMutualBenefit: false,
        limit: 3,
        usedThisMonth: 0,
        remaining: 3,
        canUnlockWithQuota: true,
        canPayExtra: false,
        extraContactFeePaise: 2900,
        planSlug: 'free',
      }),
    };

    profilesService = new ProfilesService(mockDb, mockBlocks as any, mockEntitlements as any);
  });

  const sampleCompletePayload: CompleteRegistrationPayload = {
    phone: '9876543210',
    otp: '123456',
    consentAccepted: true,
    profileFor: 'Myself',
    fullName: 'Karthik Loganathan',
    gender: 'Male',
    dobDay: '15',
    dobMonth: '06',
    dobYear: '1995',
    maritalStatus: 'Never Married',
    hasChildren: false,
    childrenCount: 0,
    childrenLivingWithMe: false,
    heightCm: 175,
    aboutMe: 'Software engineer in Chennai.',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    religion: 'Hindu',
    caste: 'Brahmin - Iyer',
    subcaste: 'Vadama',
    gotra: 'Kashyapa',
    motherTongue: 'Tamil',
    educationLevel: 'Bachelors',
    degree: 'B.Tech',
    collegeName: 'Anna University',
    employmentStatus: 'Employed',
    profession: 'Software Engineer',
    companyName: 'Tech Corp',
    companySector: 'MNC',
    annualIncome: '25-50 Lakhs',
    familyValues: 'Moderate',
    familyType: 'Nuclear',
    fatherOccupation: 'Retired',
    motherOccupation: 'Homemaker',
    brothersCount: 1,
    sistersCount: 0,
    diet: 'Vegetarian',
    smoking: 'Never',
    alcohol: 'Never',
    interests: ['Music', 'Hiking'],
    birthTime: '10:00 AM',
    birthPlace: 'Chennai',
    manglik: 'No',
    rashi: 'Mesha',
    nakshatra: 'Ashwini',
    prefAgeMin: 23,
    prefAgeMax: 28,
    prefHeightMinCm: 155,
    prefHeightMaxCm: 175,
    prefMaritalStatuses: ['Never Married'],
    prefReligions: ['Hindu'],
    prefCastes: ['Brahmin - Iyer'],
    prefMotherTongues: ['Tamil'],
    prefLocations: ['Chennai'],
    photoS3Keys: ['photos/user1_primary.jpg', 'photos/user1_secondary.jpg'],
    photoPrivacy: 'blurred',
    verificationMethod: 'selfie',
    selfieS3Key: 'vault/selfie.jpg',
  };

  describe('completeRegistration', () => {
    it('should create new profile and all related sections inside a transaction when no profile exists', async () => {
      // Check existing profile -> none
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      // Insert profile returning new ID
      mockDb.insert.mockImplementation((table: any) => {
        if (table === profiles) {
          return {
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ id: 'new-profile-uuid' }]),
            }),
          };
        }
        return {
          values: jest.fn().mockReturnValue({
            onConflictDoUpdate: jest.fn().mockResolvedValue({}),
          }),
        };
      });

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await profilesService.completeRegistration('user-1', sampleCompletePayload);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Profile registration completed successfully',
        profileId: 'new-profile-uuid',
      });
    });

    it('should update existing profile when profile already exists for user', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'existing-profile-uuid' }]),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      mockDb.insert.mockImplementation(() => ({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue({}),
        }),
      }));

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await profilesService.completeRegistration('user-1', sampleCompletePayload);

      expect(result).toEqual({
        success: true,
        message: 'Profile registration completed successfully',
        profileId: 'existing-profile-uuid',
      });
    });
  });

  describe('getMyProfile', () => {
    it('should return complete composite profile view with family, lifestyle, horoscope, photos', async () => {
      const mockProfile = { id: 'prof-1', userId: 'user-1', fullName: 'Karthik' };
      const mockFamily = { id: 'fam-1', profileId: 'prof-1', familyValues: 'Moderate' };
      const mockLifestyle = { id: 'life-1', profileId: 'prof-1', diet: 'Vegetarian' };
      const mockHoroscope = { id: 'horo-1', profileId: 'prof-1', manglik: 'No' };
      const mockVerification = { id: 'ver-1', profileId: 'prof-1', status: 'verified' };
      const mockPhotos = [{ id: 'p1', s3Key: 'photo1.jpg', isPrimary: true, displayOrder: 0 }];

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) {
          // profiles
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockProfile]),
          };
        } else if (selectCall === 2) {
          // family
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockFamily]),
          };
        } else if (selectCall === 3) {
          // lifestyle
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockLifestyle]),
          };
        } else if (selectCall === 4) {
          // horoscope
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockHoroscope]),
          };
        } else if (selectCall === 5) {
          // verification
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockVerification]),
          };
        } else {
          // photos
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockResolvedValue(mockPhotos),
          };
        }
      });

      const fullProfile = await profilesService.getMyProfile('user-1');

      expect(fullProfile.profile).toEqual(mockProfile);
      expect(fullProfile.family).toEqual(mockFamily);
      expect(fullProfile.lifestyle).toEqual(mockLifestyle);
      expect(fullProfile.horoscope).toEqual(mockHoroscope);
      expect(fullProfile.verificationStatus).toBe('verified');
      expect(fullProfile.photos).toEqual(mockPhotos);
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(profilesService.getMyProfile('user-unknown')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateMyProfile', () => {
    it('should throw NotFoundException if profile to update is not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(
        profilesService.updateMyProfile('user-unknown', { aboutMe: 'New Bio' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should update profile fields across tables and return updated full profile', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'prof-1' }]),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Mock getMyProfile call at the end of updateMyProfile
      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1', aboutMe: 'Updated bio' } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      const updated = await profilesService.updateMyProfile('user-1', {
        aboutMe: 'Updated bio',
        diet: 'Vegetarian',
        familyValues: 'Liberal',
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(updated.profile.aboutMe).toBe('Updated bio');
    });
  });

  describe('photo management (addPhoto, deletePhoto, reorderPhotos)', () => {
    it('should add photo as primary if it is the first photo', async () => {
      // 1st select: profile ID
      // 2nd select: existing photos -> []
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'prof-1' }]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockResolvedValue([]),
          };
        }
      });

      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1' } as any,
        photos: [{ id: 'p1', s3Key: 'photo.jpg', isPrimary: true, displayOrder: 0 }],
        verificationStatus: 'idle',
      });

      await profilesService.addPhoto('user-1', 'photo.jpg');

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          profileId: 'prof-1',
          s3Key: 'photo.jpg',
          isPrimary: true,
          displayOrder: 0,
        })
      );
    });

    it('should delete photo and promote next photo to primary if deleted photo was primary', async () => {
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // user profile
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'prof-1' }]),
          };
        } else if (selectCount === 2) {
          // photo being deleted (isPrimary: true)
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'photo-1', profileId: 'prof-1', isPrimary: true }]),
          };
        } else {
          // remaining photos
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockResolvedValue([{ id: 'photo-2', profileId: 'prof-1', isPrimary: false }]),
          };
        }
      });

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const mockSet = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockResolvedValue(undefined);
      mockDb.update.mockReturnValue({ set: mockSet, where: mockWhere });

      const result = await profilesService.deletePhoto('user-1', 'photo-1');

      expect(mockDb.delete).toHaveBeenCalledWith(profilePhotos);
      // Verify promotion of next photo to primary
      expect(mockSet).toHaveBeenCalledWith({ isPrimary: true });
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when deleting photo belonging to someone else', async () => {
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'prof-1' }]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'photo-1', profileId: 'OTHER_PROFILE' }]),
          };
        }
      });

      await expect(profilesService.deletePhoto('user-1', 'photo-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should reorder photos in transaction and set first as primary', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'prof-1' }]),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1' } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.reorderPhotos('user-1', ['photo-2', 'photo-1']);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalledWith(profilePhotos);
    });
  });

  describe('getProfileById & privacy blur logic', () => {
    it('should throw NotFoundException if requested profile does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(profilesService.getProfileById('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should blur photo when viewer is not owner and not connected and photoBlur setting is always', async () => {
      const targetProfile = { id: 'target-prof', userId: 'target-user', fullName: 'Target User' };
      const viewerUserId = 'viewer-user';

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) {
          // target profile
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([targetProfile]),
          };
        } else if (selectCall === 2) {
          // viewer profile
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'viewer-prof' }]),
          };
        } else if (selectCall >= 3 && selectCall <= 6) {
          // family, lifestyle, horoscope, verifications
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        } else if (selectCall === 7) {
          // photos
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockResolvedValue([{ id: 'p1', s3Key: 'key.jpg', isPrimary: true }]),
          };
        } else if (selectCall === 8) {
          // userSettings -> photoBlur: 'always'
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ photoBlur: 'always' }]),
          };
        } else if (selectCall === 9) {
          // viewer profile again for blur logic check
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'viewer-prof' }]),
          };
        } else {
          // interests connection -> not accepted
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        }
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await profilesService.getProfileById('target-prof', viewerUserId);

      expect(result.blurPhoto).toBe(true);
    });

    it('should NOT blur photo when connection status is accepted', async () => {
      const targetProfile = { id: 'target-prof', userId: 'target-user', fullName: 'Target User' };
      const viewerUserId = 'viewer-user';

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([targetProfile]),
          };
        } else if (selectCall === 2) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'viewer-prof' }]),
          };
        } else if (selectCall >= 3 && selectCall <= 6) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        } else if (selectCall === 7) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockResolvedValue([{ id: 'p1', s3Key: 'key.jpg', isPrimary: true }]),
          };
        } else if (selectCall === 8) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ photoBlur: 'always' }]),
          };
        } else if (selectCall === 9) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'viewer-prof' }]),
          };
        } else {
          // Accepted connection exists!
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'interest-1', status: 'accepted' }]),
          };
        }
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await profilesService.getProfileById('target-prof', viewerUserId);

      expect(result.blurPhoto).toBe(false);
    });
  });

  describe('recordVisit', () => {
    it('should record visit in profileViews table for a distinct viewer', async () => {
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // target profile
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'target-profile-id' }]),
          };
        } else {
          // viewer profile
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'viewer-profile-id' }]),
          };
        }
      });

      const mockDoNothing = jest.fn().mockResolvedValue(undefined);
      const mockValues = jest.fn().mockReturnValue({ onConflictDoNothing: mockDoNothing });
      mockDb.insert.mockReturnValue({ values: mockValues });

      await profilesService.recordVisit('target-profile-id', 'viewer-user-id');

      expect(mockValues).toHaveBeenCalledWith({
        viewerProfileId: 'viewer-profile-id',
        targetProfileId: 'target-profile-id',
      });
    });

    it('should not record visit if viewer is viewing their own profile', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'same-profile-id' }]),
      });

      await profilesService.recordVisit('same-profile-id', 'same-user-id');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });
});
