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

  /** DOB parts for someone born `years` ago (plus optional day offset), zero-padded. */
  const dobPartsYearsAgo = (years: number, extraDays = 0) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    d.setDate(d.getDate() + extraDays);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      dobDay: pad(d.getDate()),
      dobMonth: pad(d.getMonth() + 1),
      dobYear: String(d.getFullYear()),
    };
  };

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

    profilesService = new ProfilesService(
      mockDb,
      mockBlocks as any,
      mockEntitlements as any,
    );
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
    citySlug: 'chennai-tamil-nadu',
    religion: 'Hindu',
    caste: 'Brahmin',
    communitySlug: 'hindu-brahmin',
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
    photoS3Keys: [
      'profiles/11111111-1111-4111-8111-111111111111/photos/22222222-2222-4222-8222-222222222222.jpeg',
      'profiles/11111111-1111-4111-8111-111111111111/photos/33333333-3333-4333-8333-333333333333.jpeg',
    ],
    photoPrivacy: 'blurred',
    verificationMethod: 'selfie',
    selfieS3Key: 'verifications/11111111-1111-4111-8111-111111111111/selfie-44444444-4444-4444-8444-444444444444.jpeg',
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
      const profileValues = jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'new-profile-uuid' }]),
      });
      mockDb.insert.mockImplementation((table: any) => {
        if (table === profiles) {
          return {
            values: profileValues,
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

      const result = await profilesService.completeRegistration(
        '11111111-1111-4111-8111-111111111111',
        sampleCompletePayload,
      );

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(profileValues).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'self',
          profileFor: 'Myself',
          fullName: 'Karthik Loganathan',
          gender: 'Male',
          dob: '1995-06-15',
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Profile registration completed successfully',
        profileId: 'new-profile-uuid',
      });
    });

    it('persists the member’s chosen preferences instead of the old fabricated defaults', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const profileValues = jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'new-profile-uuid' }]),
      });
      // Capture the values handed to each child-table insert.
      const insertsByTable = new Map<any, jest.Mock>();
      mockDb.insert.mockImplementation((table: any) => {
        if (table === profiles) return { values: profileValues };
        const values = jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue({}),
        });
        insertsByTable.set(table, values);
        return { values };
      });
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      await profilesService.completeRegistration('11111111-1111-4111-8111-111111111111', {
        ...sampleCompletePayload,
        prefAgeMin: 30,
        prefAgeMax: 40,
        prefHeightMinCm: 155,
        prefHeightMaxCm: 185,
        prefReligions: ['Muslim'],
        prefMaritalStatuses: ['Never Married', 'Divorced'],
        prefCastes: ['Sunni'],
        prefMotherTongues: ['Urdu'],
        prefMinEducation: 'Masters',
        prefLocations: ['Hyderabad', 'Bengaluru'],
      });

      const prefValues = insertsByTable.get(partnerPreferences);
      expect(prefValues).toBeDefined();
      expect(prefValues).toHaveBeenCalledWith(
        expect.objectContaining({
          prefAgeMin: 30,
          prefAgeMax: 40,
          prefHeightMinCm: 155,
          prefHeightMaxCm: 185,
          prefReligions: ['Muslim'],
          prefMaritalStatuses: ['Never Married', 'Divorced'],
          prefCastes: ['Sunni'],
          prefMotherTongues: ['Urdu'],
          prefMinEducation: 'Masters',
          prefLocations: ['Hyderabad', 'Bengaluru'],
        }),
      );

      // Guard against a regression to the hardcoded fallbacks.
      const written = prefValues!.mock.calls[0][0];
      expect(written.prefReligions).not.toEqual(['Hindu']);
      expect(written.prefAgeMin).not.toBe(24);
      expect(written.prefAgeMax).not.toBe(32);
    });

    it('should persist willingToRelocate on registration when provided', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const profileValues = jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'new-profile-uuid' }]),
      });
      mockDb.insert.mockImplementation((table: any) => {
        if (table === profiles) return { values: profileValues };
        return {
          values: jest.fn().mockReturnValue({
            onConflictDoUpdate: jest.fn().mockResolvedValue({}),
          }),
        };
      });
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      await profilesService.completeRegistration('11111111-1111-4111-8111-111111111111', {
        ...sampleCompletePayload,
        willingToRelocate: 'Yes',
      } as any);

      expect(profileValues).toHaveBeenCalledWith(
        expect.objectContaining({ willingToRelocate: 'Yes' }),
      );
    });

    it('should default willingToRelocate to null on registration when omitted', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const profileValues = jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'new-profile-uuid' }]),
      });
      mockDb.insert.mockImplementation((table: any) => {
        if (table === profiles) return { values: profileValues };
        return {
          values: jest.fn().mockReturnValue({
            onConflictDoUpdate: jest.fn().mockResolvedValue({}),
          }),
        };
      });
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      await profilesService.completeRegistration(
        '11111111-1111-4111-8111-111111111111',
        sampleCompletePayload,
      );

      expect(profileValues).toHaveBeenCalledWith(
        expect.objectContaining({ willingToRelocate: null }),
      );
    });

    it('should reject invalid profileFor without junk-defaulting to Myself', async () => {
      await expect(
        profilesService.completeRegistration('user-1', {
          ...sampleCompletePayload,
          profileFor: 'Cousin' as any,
        }),
      ).rejects.toThrow(/profileFor/i);
    });

    it('should reject an impossible calendar date on registration', async () => {
      await expect(
        profilesService.completeRegistration('user-1', {
          ...sampleCompletePayload,
          dobDay: '30',
          dobMonth: '02',
          dobYear: '2000',
        }),
      ).rejects.toThrow(/date of birth/i);
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should keep createdBy=self even if the payload smuggles createdBy=staff', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const profileValues = jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'new-profile-uuid' }]),
      });
      mockDb.insert.mockImplementation((table: any) => {
        if (table === profiles) return { values: profileValues };
        return {
          values: jest.fn().mockReturnValue({
            onConflictDoUpdate: jest.fn().mockResolvedValue({}),
          }),
        };
      });
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      await profilesService.completeRegistration('11111111-1111-4111-8111-111111111111', {
        ...sampleCompletePayload,
        createdBy: 'staff',
      } as any);

      expect(profileValues).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'self' }),
      );
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

      const result = await profilesService.completeRegistration(
        '11111111-1111-4111-8111-111111111111',
        sampleCompletePayload,
      );

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
      const mockPreferences = { id: 'pref-1', profileId: 'prof-1', prefAgeMin: 24 };
      const mockPhotos = [
        {
          id: 'p1',
          s3Key: 'profiles/user-1/photos/p1.jpeg',
          isPrimary: true,
          displayOrder: 0,
          status: 'pending',
        },
      ];

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockProfile]),
          };
        }
        if (selectCall <= 6) {
          const rows =
            selectCall === 2
              ? [mockFamily]
              : selectCall === 3
                ? [mockLifestyle]
                : selectCall === 4
                  ? [mockHoroscope]
                  : selectCall === 5
                    ? [mockVerification]
                    : [mockPreferences];
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue(rows),
          };
        }
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockPhotos),
        };
      });

      const fullProfile = await profilesService.getMyProfile('user-1');

      expect(fullProfile.profile).toEqual(expect.objectContaining(mockProfile));
      expect(fullProfile.family).toEqual(mockFamily);
      expect(fullProfile.lifestyle).toEqual(mockLifestyle);
      expect(fullProfile.horoscope).toEqual(mockHoroscope);
      expect(fullProfile.preferences).toEqual(mockPreferences);
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

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue({}),
        }),
      });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1', aboutMe: 'Updated bio' } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      const updated = await profilesService.updateMyProfile('user-1', {
        aboutMe: 'Updated bio',
        diet: 'Vegetarian',
        familyValues: 'Liberal',
        prefAgeMin: 25,
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
      expect(updated.profile.aboutMe).toBe('Updated bio');
    });

    it('upserts family_details including familyStatus and sibling counts', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'prof-1', maritalStatus: 'Never Married' }]),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const valuesMock = jest.fn().mockReturnValue({
        onConflictDoUpdate: jest.fn().mockResolvedValue({}),
      });
      mockDb.insert.mockReturnValue({ values: valuesMock });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1' } as any,
        family: {
          familyType: 'Extended',
          familyValues: 'Traditional',
          familyStatus: 'Upper middle class',
          fatherOccupation: 'Retired',
          motherOccupation: 'Homemaker',
          brothersCount: 2,
          sistersCount: 1,
        } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', {
        familyType: 'Extended',
        familyValues: 'Traditional',
        familyStatus: 'Upper middle class',
        fatherOccupation: 'Retired',
        motherOccupation: 'Homemaker',
        brothersCount: 2,
        sistersCount: 1,
      });

      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          profileId: 'prof-1',
          familyType: 'Extended',
          familyValues: 'Traditional',
          familyStatus: 'Upper middle class',
          fatherOccupation: 'Retired',
          motherOccupation: 'Homemaker',
          brothersCount: 2,
          sistersCount: 1,
        }),
      );
    });

    it('upserts horoscope fields and clears optional text/file columns to null', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'prof-1', maritalStatus: 'Never Married' }]),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const onConflictDoUpdate = jest.fn().mockResolvedValue({});
      const valuesMock = jest.fn().mockReturnValue({ onConflictDoUpdate });
      mockDb.insert.mockReturnValue({ values: valuesMock });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1' } as any,
        horoscope: {
          birthTime: '10:45 AM',
          birthPlace: 'Madurai',
          manglik: 'No',
          rashi: 'Mesha',
          nakshatra: 'Ashwini',
          horoscopeS3Key: 'profiles/u1/horoscopes/a.pdf',
          horoscopeFileName: 'kundli.pdf',
          horoscopeFileSizeBytes: 2048,
        } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', {
        birthTime: '10:45 AM',
        birthPlace: 'Madurai',
        manglik: 'No',
        rashi: 'Mesha',
        nakshatra: 'Ashwini',
        horoscopeS3Key: 'profiles/u1/horoscopes/a.pdf',
        horoscopeFileName: 'kundli.pdf',
        horoscopeFileSizeBytes: 2048,
      });

      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          profileId: 'prof-1',
          birthTime: '10:45 AM',
          birthPlace: 'Madurai',
          manglik: 'No',
          rashi: 'Mesha',
          nakshatra: 'Ashwini',
          horoscopeS3Key: 'profiles/u1/horoscopes/a.pdf',
          horoscopeFileName: 'kundli.pdf',
          horoscopeFileSizeBytes: 2048,
        }),
      );

      valuesMock.mockClear();
      onConflictDoUpdate.mockClear();

      await profilesService.updateMyProfile('user-1', {
        birthTime: null,
        birthPlace: '',
        rashi: null,
        nakshatra: '',
        horoscopeS3Key: null,
        horoscopeFileName: '',
        horoscopeFileSizeBytes: 0,
      });

      expect(onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            birthTime: null,
            birthPlace: null,
            rashi: null,
            nakshatra: null,
            horoscopeS3Key: null,
            horoscopeFileName: null,
            horoscopeFileSizeBytes: null,
          }),
        }),
      );
    });

    it('clears family enum fields to null when PATCH sends null', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'prof-1', maritalStatus: 'Never Married' }]),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const onConflictDoUpdate = jest.fn().mockResolvedValue({});
      const valuesMock = jest.fn().mockReturnValue({ onConflictDoUpdate });
      mockDb.insert.mockReturnValue({ values: valuesMock });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1' } as any,
        family: null,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', {
        familyStatus: null,
        familyValues: null,
        fatherOccupation: null,
        motherOccupation: null,
      } as any);

      expect(onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            familyStatus: null,
            familyValues: null,
            fatherOccupation: null,
            motherOccupation: null,
          }),
        }),
      );
    });

    it('clears children when marital status is no longer Divorced/Widowed', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { id: 'prof-1', maritalStatus: 'Divorced', educationId: null, occupationId: null, companyId: null },
        ]),
      });

      const setMock = jest.fn().mockReturnThis();
      mockDb.update.mockReturnValue({
        set: setMock,
        where: jest.fn().mockResolvedValue(undefined),
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue({}),
        }),
      });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1', maritalStatus: 'Never Married' } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', {
        maritalStatus: 'Never Married',
        hasChildren: true,
        childrenCount: 2,
        childrenLivingWithMe: true,
      });

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          maritalStatus: 'Never Married',
          hasChildren: false,
          childrenCount: 0,
          childrenLivingWithMe: null,
        }),
      );
    });

    it('persists children when Divorced + hasChildren is complete', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            id: 'prof-1',
            maritalStatus: 'Never Married',
            educationId: null,
            occupationId: null,
            companyId: null,
          },
        ]),
      });

      const setMock = jest.fn().mockReturnThis();
      mockDb.update.mockReturnValue({
        set: setMock,
        where: jest.fn().mockResolvedValue(undefined),
      });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1', maritalStatus: 'Divorced', hasChildren: true } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', {
        maritalStatus: 'Divorced',
        hasChildren: true,
        childrenCount: 2,
        childrenLivingWithMe: true,
      });

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          maritalStatus: 'Divorced',
          hasChildren: true,
          childrenCount: 2,
          childrenLivingWithMe: true,
        }),
      );
    });

    it('rejects incomplete children when stored marital is Divorced', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { id: 'prof-1', maritalStatus: 'Divorced', educationId: null, occupationId: null, companyId: null },
        ]),
      });

      await expect(
        profilesService.updateMyProfile('user-1', {
          hasChildren: true,
          childrenCount: 2,
        }),
      ).rejects.toThrow(/children live with you/i);
    });

    it('rejects invalid maritalStatus on update', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { id: 'prof-1', maritalStatus: 'Never Married', educationId: null, occupationId: null, companyId: null },
        ]),
      });

      await expect(
        profilesService.updateMyProfile('user-1', {
          maritalStatus: 'Separated' as any,
        }),
      ).rejects.toThrow(/maritalStatus/i);
    });

    it('persists weightKg and complexion', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'prof-1', maritalStatus: 'Never Married' }]),
      });

      const setMock = jest.fn().mockReturnThis();
      mockDb.update.mockReturnValue({
        set: setMock,
        where: jest.fn().mockResolvedValue(undefined),
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue({}),
        }),
      });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1', weightKg: 62, complexion: 'Fair' } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', {
        weightKg: 62,
        complexion: 'Fair',
        disability: null,
      });

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          weightKg: 62,
          complexion: 'Fair',
          disability: null,
        }),
      );
    });

    it('coerces empty-string complexion/disability to null (not "")', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'prof-1', maritalStatus: 'Never Married' }]),
      });

      const setMock = jest.fn().mockReturnThis();
      mockDb.update.mockReturnValue({
        set: setMock,
        where: jest.fn().mockResolvedValue(undefined),
      });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1', complexion: null, disability: null } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', {
        complexion: '' as any,
        disability: '' as any,
      });

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          complexion: null,
          disability: null,
        }),
      );
    });

    it('persists willingToRelocate on profile edit', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'prof-1', maritalStatus: 'Never Married' }]),
      });

      const setMock = jest.fn().mockReturnThis();
      mockDb.update.mockReturnValue({
        set: setMock,
        where: jest.fn().mockResolvedValue(undefined),
      });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1', willingToRelocate: 'Open to discussion' } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', {
        willingToRelocate: 'Open to discussion',
      });

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({ willingToRelocate: 'Open to discussion' }),
      );
    });

    it('stores free-text subcaste/gotra and clears empty strings to null', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'prof-1', maritalStatus: 'Never Married' }]),
      });

      const setMock = jest.fn().mockReturnThis();
      mockDb.update.mockReturnValue({
        set: setMock,
        where: jest.fn().mockResolvedValue(undefined),
      });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1', subcaste: null, gotra: null } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', {
        subcaste: 'Vadama',
        gotra: '',
      } as any);

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subcaste: 'Vadama',
          gotra: null,
        }),
      );
    });

    it('updates profileFor, fullName, gender, and dob together', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            id: 'prof-1',
            maritalStatus: 'Never Married',
            gender: 'Female',
            educationId: null,
            occupationId: null,
            companyId: null,
          },
        ]),
      });

      const setMock = jest.fn().mockReturnThis();
      mockDb.update.mockReturnValue({
        set: setMock,
        where: jest.fn().mockResolvedValue(undefined),
      });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: {
          id: 'prof-1',
          profileFor: 'Daughter',
          fullName: 'Ananya Sharma',
          gender: 'Female',
          dob: '1998-06-15',
        } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', {
        profileFor: 'Daughter',
        fullName: 'Ananya Sharma',
        gender: 'Female',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1998',
      });

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          profileFor: 'Daughter',
          fullName: 'Ananya Sharma',
          gender: 'Female',
          dob: '1998-06-15',
        }),
      );
    });

    it('rejects partial DOB updates', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { id: 'prof-1', maritalStatus: 'Never Married', gender: 'Male' },
        ]),
      });

      await expect(
        profilesService.updateMyProfile('user-1', {
          dobDay: '15',
          dobMonth: '06',
        }),
      ).rejects.toThrow(/day, month, and year/i);
    });

    it('rejects underage DOB on update using stored gender', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { id: 'prof-1', maritalStatus: 'Never Married', gender: 'Male' },
        ]),
      });

      await expect(
        profilesService.updateMyProfile('user-1', {
          dobDay: '01',
          dobMonth: '01',
          dobYear: '2010',
        }),
      ).rejects.toThrow(/at least 21/i);
    });

    it('rejects invalid profileFor on update', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { id: 'prof-1', maritalStatus: 'Never Married', gender: 'Male' },
        ]),
      });

      await expect(
        profilesService.updateMyProfile('user-1', {
          profileFor: 'Friend' as any,
        }),
      ).rejects.toThrow(/profileFor/i);
    });

    it('accepts another curated profileFor value (Relative) on update', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            id: 'prof-1',
            maritalStatus: 'Never Married',
            gender: 'Female',
            educationId: null,
            occupationId: null,
            companyId: null,
          },
        ]),
      });

      const setMock = jest.fn().mockReturnThis();
      mockDb.update.mockReturnValue({
        set: setMock,
        where: jest.fn().mockResolvedValue(undefined),
      });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1', profileFor: 'Relative' } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', { profileFor: 'Relative' });

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({ profileFor: 'Relative' }),
      );
    });

    it('allows gender-only update without touching DOB', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            id: 'prof-1',
            maritalStatus: 'Never Married',
            gender: 'Female',
            educationId: null,
            occupationId: null,
            companyId: null,
          },
        ]),
      });

      const setMock = jest.fn().mockReturnThis();
      mockDb.update.mockReturnValue({
        set: setMock,
        where: jest.fn().mockResolvedValue(undefined),
      });

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1', gender: 'Other' } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.updateMyProfile('user-1', { gender: 'Other' });

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ gender: 'Other' }));
      expect(setMock).toHaveBeenCalledWith(expect.not.objectContaining({ dob: expect.anything() }));
    });

    it('rejects underage DOB for Female using stored gender (boundary)', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { id: 'prof-1', maritalStatus: 'Never Married', gender: 'Female' },
        ]),
      });

      // Birthday tomorrow: still 17 today.
      const almostEighteen = dobPartsYearsAgo(18, 1);
      await expect(
        profilesService.updateMyProfile('user-1', almostEighteen),
      ).rejects.toThrow(/at least 18/i);
    });
  });

  describe('photo management (addPhoto, deletePhoto, reorderPhotos)', () => {
    it('should add photo as primary if it is the first photo', async () => {
      const userId = '11111111-1111-4111-8111-111111111111';
      const s3Key = `profiles/${userId}/photos/22222222-2222-4222-8222-222222222222.jpeg`;
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
        photos: [{ id: 'p1', s3Key, isPrimary: true, displayOrder: 0 }],
        verificationStatus: 'idle',
      });

      await profilesService.addPhoto(userId, s3Key);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          profileId: 'prof-1',
          s3Key,
          isPrimary: true,
          displayOrder: 0,
        })
      );
    });

    it('should reject a duplicate photo hash', async () => {
      const userId = '11111111-1111-4111-8111-111111111111';
      const s3Key = `profiles/${userId}/photos/33333333-3333-4333-8333-333333333333.jpeg`;
      const contentHash = 'a'.repeat(64);
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'prof-1' }]),
          };
        }
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue([{ id: 'p1', s3Key: 'other.jpeg', contentHash }]),
        };
      });

      await expect(profilesService.addPhoto(userId, s3Key, contentHash)).rejects.toThrow(
        'This photo is already on your profile.',
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

      const refreshed = {
        profile: { id: 'prof-1' } as any,
        photos: [{ id: 'photo-2', s3Key: 'profiles/u/2.jpeg', isPrimary: true, displayOrder: 0 }],
        verificationStatus: 'idle' as const,
      };
      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue(refreshed as any);

      const result = await profilesService.deletePhoto('user-1', 'photo-1');

      expect(mockDb.delete).toHaveBeenCalledWith(profilePhotos);
      // Verify promotion of next photo to primary
      expect(mockSet).toHaveBeenCalledWith({ isPrimary: true });
      // Client needs the refreshed profile so avatars update immediately.
      expect(result).toEqual(refreshed);
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
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'prof-1' }]),
          };
        }
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ id: 'photo-2' }, { id: 'photo-1' }]),
        };
      });

      mockDb.execute = jest.fn().mockResolvedValue(undefined);

      jest.spyOn(profilesService, 'getMyProfile').mockResolvedValue({
        profile: { id: 'prof-1' } as any,
        photos: [],
        verificationStatus: 'idle',
      });

      await profilesService.reorderPhotos('user-1', ['photo-2', 'photo-1']);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.execute).toHaveBeenCalled();
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
        const resolveLimit = (value: unknown) => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(value),
            orderBy: jest.fn().mockResolvedValue(value),
          }),
        });

        if (selectCall === 1) {
          return resolveLimit([targetProfile]);
        }
        // Promise.all: family, lifestyle, horoscope, verification, photos
        if (selectCall >= 2 && selectCall <= 5) {
          return resolveLimit([]);
        }
        if (selectCall === 6) {
          return resolveLimit([{ id: 'p1', s3Key: 'key.jpg', isPrimary: true, displayOrder: 0 }]);
        }
        if (selectCall === 7) {
          // viewer profile (blocks)
          return resolveLimit([{ id: 'viewer-prof' }]);
        }
        if (selectCall === 8) {
          // userSettings photoBlur
          return resolveLimit([{ photoBlur: 'always' }]);
        }
        if (selectCall === 9) {
          // viewer profile for mutual connect
          return resolveLimit([{ id: 'viewer-prof' }]);
        }
        // interests — no accepted connection
        return resolveLimit([]);
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
        const resolveLimit = (value: unknown) => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(value),
            orderBy: jest.fn().mockResolvedValue(value),
          }),
        });

        if (selectCall === 1) {
          return resolveLimit([targetProfile]);
        }
        if (selectCall >= 2 && selectCall <= 5) {
          return resolveLimit([]);
        }
        if (selectCall === 6) {
          return resolveLimit([{ id: 'p1', s3Key: 'key.jpg', isPrimary: true, displayOrder: 0 }]);
        }
        if (selectCall === 7) {
          return resolveLimit([{ id: 'viewer-prof' }]);
        }
        if (selectCall === 8) {
          return resolveLimit([{ photoBlur: 'always' }]);
        }
        if (selectCall === 9) {
          return resolveLimit([{ id: 'viewer-prof' }]);
        }
        // Accepted connection exists
        return resolveLimit([{ id: 'interest-1', status: 'accepted' }]);
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
