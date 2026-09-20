import {
  step2IdentitySchema,
  step3CommunitySchema,
  step4CareerSchema,
  step5LifestyleAstrologySchema,
  step6VerificationSchema,
  updateProfileSchema,
  completeRegistrationSchema,
} from '@astalakshimi/validation';

/** DOB parts for someone born `years` ago (plus optional day offset), zero-padded. */
function dobPartsYearsAgo(years: number, extraDays = 0) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() + extraDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    dobDay: pad(d.getDate()),
    dobMonth: pad(d.getMonth() + 1),
    dobYear: String(d.getFullYear()),
  };
}

describe('Feature 2: Profile - Zod Validation Schemas', () => {
  describe('step2IdentitySchema', () => {
    it('should validate a correct step 2 payload for a male >= 21 years old', () => {
      const validPayload = {
        profileFor: 'Myself',
        fullName: 'Karthik Loganathan',
        gender: 'Male' as const,
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1995',
        maritalStatus: 'Never Married' as const,
        heightCm: 175,
        aboutMe: 'Software engineer who loves Carnatic music and hiking.',
      };

      const result = step2IdentitySchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should validate a correct step 2 payload for a female >= 18 years old', () => {
      const validPayload = {
        profileFor: 'Daughter',
        fullName: 'Ananya Sharma',
        gender: 'Female' as const,
        dobDay: '20',
        dobMonth: '08',
        dobYear: '2004',
        maritalStatus: 'Never Married' as const,
        heightCm: 160,
      };

      const result = step2IdentitySchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject male age under 21', () => {
      const currentYear = new Date().getFullYear();
      const payload = {
        profileFor: 'Myself',
        fullName: 'Young Guy',
        gender: 'Male' as const,
        dobDay: '01',
        dobMonth: '01',
        dobYear: String(currentYear - 19), // 19 years old
        maritalStatus: 'Never Married' as const,
        heightCm: 170,
      };

      const result = step2IdentitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('at least 21 years old'))).toBe(true);
      }
    });

    it('should reject female age under 18', () => {
      const currentYear = new Date().getFullYear();
      const payload = {
        profileFor: 'Myself',
        fullName: 'Young Girl',
        gender: 'Female' as const,
        dobDay: '01',
        dobMonth: '01',
        dobYear: String(currentYear - 16), // 16 years old
        maritalStatus: 'Never Married' as const,
        heightCm: 160,
      };

      const result = step2IdentitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('at least 18 years old'))).toBe(true);
      }
    });

    it('should reject invalid calendar date (e.g. Feb 30)', () => {
      const payload = {
        profileFor: 'Myself',
        fullName: 'Test User',
        gender: 'Male' as const,
        dobDay: '30',
        dobMonth: '02',
        dobYear: '1995',
        maritalStatus: 'Never Married' as const,
        heightCm: 175,
      };

      const result = step2IdentitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('Invalid date of birth'))).toBe(true);
      }
    });

    it('should reject names containing numbers or special symbols', () => {
      const payload = {
        profileFor: 'Myself',
        fullName: 'Karthik123!',
        gender: 'Male' as const,
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1995',
        maritalStatus: 'Never Married' as const,
        heightCm: 175,
      };

      const result = step2IdentitySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('only contain letters'))).toBe(true);
      }
    });

    it('should reject height outside valid boundaries (120cm - 230cm)', () => {
      const tooShort = {
        profileFor: 'Myself',
        fullName: 'Short User',
        gender: 'Male' as const,
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1995',
        maritalStatus: 'Never Married' as const,
        heightCm: 110, // < 120
      };

      expect(step2IdentitySchema.safeParse(tooShort).success).toBe(false);

      const tooTall = {
        ...tooShort,
        heightCm: 250, // > 230
      };

      expect(step2IdentitySchema.safeParse(tooTall).success).toBe(false);
    });

    it('requires children details when marital status is Divorced', () => {
      const payload = {
        profileFor: 'Myself',
        fullName: 'Test User',
        gender: 'Female' as const,
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1995',
        maritalStatus: 'Divorced' as const,
        heightCm: 160,
      };

      expect(step2IdentitySchema.safeParse(payload).success).toBe(false);
      expect(
        step2IdentitySchema.safeParse({
          ...payload,
          hasChildren: true,
          childrenCount: 2,
          childrenLivingWithMe: true,
        }).success,
      ).toBe(true);
    });

    it('accepts Awaiting Divorce without children questions', () => {
      expect(
        step2IdentitySchema.safeParse({
          profileFor: 'Myself',
          fullName: 'Test User',
          gender: 'Female',
          dobDay: '15',
          dobMonth: '06',
          dobYear: '1995',
          maritalStatus: 'Awaiting Divorce',
        }).success,
      ).toBe(true);
    });

    it('rejects Divorced + hasChildren without childrenLivingWithMe', () => {
      expect(
        step2IdentitySchema.safeParse({
          profileFor: 'Myself',
          fullName: 'Test User',
          gender: 'Female',
          dobDay: '15',
          dobMonth: '06',
          dobYear: '1995',
          maritalStatus: 'Divorced',
          hasChildren: true,
          childrenCount: 1,
        }).success,
      ).toBe(false);
    });
  });

  describe('step3CommunitySchema', () => {
    it('should validate complete community and family details', () => {
      const payload = {
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        religion: 'Hindu',
        caste: 'Brahmin',
        subcaste: 'Vadama',
        gotra: 'Kashyapa',
        motherTongue: 'Tamil',
        familyValues: 'Moderate' as const,
        familyType: 'Nuclear' as const,
        fatherOccupation: 'Retired' as const,
        motherOccupation: 'Homemaker' as const,
        brothersCount: 1,
        sistersCount: 0,
      };

      const result = step3CommunitySchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject when mandatory fields (city, caste, motherTongue) are missing', () => {
      const payload = {
        city: '',
        state: 'Tamil Nadu',
        religion: 'Hindu',
        caste: '',
        motherTongue: '',
        familyValues: 'Moderate' as const,
        familyType: 'Nuclear' as const,
        fatherOccupation: 'Retired' as const,
        motherOccupation: 'Homemaker' as const,
      };

      const result = step3CommunitySchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should accept and preserve willingToRelocate when provided', () => {
      const payload = {
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        willingToRelocate: 'Yes',
        religion: 'Hindu',
        caste: 'Brahmin',
        motherTongue: 'Tamil',
      };

      const result = step3CommunitySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.willingToRelocate).toBe('Yes');
      }
    });

    it('should coerce empty-string willingToRelocate to undefined (not required)', () => {
      const payload = {
        city: 'Chennai',
        state: 'Tamil Nadu',
        willingToRelocate: '',
        religion: 'Hindu',
        caste: 'Brahmin',
        motherTongue: 'Tamil',
      };

      const result = step3CommunitySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.willingToRelocate).toBeUndefined();
      }
    });
  });

  describe('step4CareerSchema', () => {
    it('should validate education and career details', () => {
      const payload = {
        educationLevel: 'Bachelors' as const,
        degree: 'B.Tech in Computer Science',
        collegeName: 'Anna University',
        employmentStatus: 'Employed' as const,
        profession: 'Software Architect',
        companyName: 'Tech Corp',
        companySector: 'MNC' as const,
        annualIncome: '25-50 Lakhs',
      };

      const result = step4CareerSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept optional career fields when left blank', () => {
      const payload = {
        educationLevel: 'Bachelors' as const,
        degree: '',
        employmentStatus: 'Employed' as const,
        profession: '',
        annualIncome: '',
      };

      const result = step4CareerSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('step5LifestyleAstrologySchema', () => {
    it('should validate lifestyle and astrology details with up to 7 interests', () => {
      const payload = {
        diet: 'Vegetarian' as const,
        smoking: 'Never' as const,
        alcohol: 'Never' as const,
        interests: ['Music', 'Reading', 'Travel', 'Yoga'],
        birthTime: '09:30 AM',
        birthPlace: 'Madurai',
        manglik: 'No' as const,
        rashi: 'Mesha',
        nakshatra: 'Ashwini',
      };

      const result = step5LifestyleAstrologySchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject more than 7 interests', () => {
      const payload = {
        diet: 'Vegetarian' as const,
        smoking: 'Never' as const,
        alcohol: 'Never' as const,
        interests: ['1', '2', '3', '4', '5', '6', '7', '8'], // 8 items
      };

      const result = step5LifestyleAstrologySchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('up to 7 interests'))).toBe(true);
      }
    });
  });

  describe('step6VerificationSchema', () => {
    it('should validate selfie verification with selfieS3Key and photos', () => {
      const payload = {
        photoS3Keys: ['photos/1.jpg', 'photos/2.jpg'],
        photoPrivacy: 'blurred' as const,
        verificationMethod: 'selfie' as const,
        selfieS3Key: 'vault/selfie.jpg',
      };

      const result = step6VerificationSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject selfie verification when selfieS3Key is missing', () => {
      const payload = {
        photoS3Keys: ['photos/1.jpg'],
        verificationMethod: 'selfie' as const,
        selfieS3Key: '',
      };

      const result = step6VerificationSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('Live selfie photo is required'))).toBe(true);
      }
    });

    it('should validate govt ID verification with govtIdType and govtIdS3Key', () => {
      const payload = {
        photoS3Keys: ['photos/1.jpg'],
        verificationMethod: 'govt_id' as const,
        govtIdType: 'Aadhaar' as const,
        govtIdS3Key: 'vault/aadhaar.pdf',
      };

      const result = step6VerificationSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject govt ID verification when govtIdType or govtIdS3Key is missing', () => {
      const payload = {
        photoS3Keys: ['photos/1.jpg'],
        verificationMethod: 'govt_id' as const,
        govtIdType: null,
        govtIdS3Key: null,
      };

      const result = step6VerificationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject when zero photos are provided', () => {
      const payload = {
        photoS3Keys: [],
        verificationMethod: 'selfie' as const,
        selfieS3Key: 'vault/selfie.jpg',
      };

      const result = step6VerificationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject when more than 6 photos are provided', () => {
      const payload = {
        photoS3Keys: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg'],
        verificationMethod: 'selfie' as const,
        selfieS3Key: 'vault/selfie.jpg',
      };

      const result = step6VerificationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should accept partial profile updates', () => {
      const partialUpdate = {
        aboutMe: 'Updated bio with new hobbies',
        annualIncome: '50-75 Lakhs',
        diet: 'Eggetarian' as const,
      };

      const result = updateProfileSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should accept and preserve willingToRelocate on edit', () => {
      const result = updateProfileSchema.safeParse({ willingToRelocate: 'Open to discussion' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.willingToRelocate).toBe('Open to discussion');
      }
    });

    it('should coerce empty-string willingToRelocate to null (explicit clear)', () => {
      const result = updateProfileSchema.safeParse({ willingToRelocate: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.willingToRelocate).toBeNull();
      }
    });

    it('should coerce empty-string subcaste/gotra to null (explicit clear)', () => {
      const result = updateProfileSchema.safeParse({ subcaste: '', gotra: '   ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subcaste).toBeNull();
        expect(result.data.gotra).toBeNull();
      }
    });

    it('should accept free-text subcaste/gotra on edit', () => {
      const result = updateProfileSchema.safeParse({
        subcaste: 'Vadama',
        gotra: 'Kashyapa',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subcaste).toBe('Vadama');
        expect(result.data.gotra).toBe('Kashyapa');
      }
    });

    it('should accept null for optional enum career fields', () => {
      const payload = {
        educationLevel: null,
        employmentStatus: null,
      };

      const result = updateProfileSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept valid enum values for educationLevel and employmentStatus', () => {
      const payload = {
        educationLevel: 'Masters',
        employmentStatus: 'Employed',
      };

      const result = updateProfileSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject invalid enum values for educationLevel', () => {
      const payload = {
        educationLevel: 'not-a-level',
      };

      const result = updateProfileSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should accept null clears and partner preference fields', () => {
      const result = updateProfileSchema.safeParse({
        educationLevel: null,
        employmentStatus: null,
        companySector: null,
        gender: 'Female',
        dobDay: '12',
        dobMonth: '03',
        dobYear: '1996',
        prefAgeMin: 24,
        prefAgeMax: 32,
        prefReligions: ['Hindu'],
        horoscopeS3Key: '',
        manglik: "Don't know",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.educationLevel).toBeNull();
        expect(result.data.employmentStatus).toBeNull();
        expect(result.data.companySector).toBeNull();
        expect(result.data.horoscopeS3Key).toBeNull();
        expect(result.data.manglik).toBe("Don't Know");
        expect(result.data.prefAgeMin).toBe(24);
      }
    });

    it('should accept horoscope field writes and null clears', () => {
      const filled = updateProfileSchema.safeParse({
        birthTime: '10:45 AM',
        birthPlace: 'Madurai',
        manglik: 'No',
        rashi: 'Mesha',
        nakshatra: 'Ashwini',
        horoscopeS3Key: 'profiles/u1/horoscopes/a.pdf',
        horoscopeFileName: 'kundli.pdf',
        horoscopeFileSizeBytes: 2048,
      });
      expect(filled.success).toBe(true);
      if (filled.success) {
        expect(filled.data.birthTime).toBe('10:45 AM');
        expect(filled.data.nakshatra).toBe('Ashwini');
        expect(filled.data.horoscopeFileSizeBytes).toBe(2048);
      }

      const cleared = updateProfileSchema.safeParse({
        birthTime: '',
        birthPlace: null,
        rashi: '   ',
        nakshatra: null,
        horoscopeS3Key: null,
        horoscopeFileName: '',
        horoscopeFileSizeBytes: 0,
      });
      expect(cleared.success).toBe(true);
      if (cleared.success) {
        expect(cleared.data.birthTime).toBeNull();
        expect(cleared.data.birthPlace).toBeNull();
        expect(cleared.data.rashi).toBeNull();
        expect(cleared.data.nakshatra).toBeNull();
        expect(cleared.data.horoscopeS3Key).toBeNull();
        expect(cleared.data.horoscopeFileName).toBeNull();
        expect(cleared.data.horoscopeFileSizeBytes).toBeNull();
      }
    });

    it('should reject invalid diet enum on update (no soft-drop)', () => {
      const result = updateProfileSchema.safeParse({
        aboutMe: 'Keep me',
        diet: 'Occasional Non-vegetarian',
      });

      expect(result.success).toBe(false);
    });

    it('should coerce empty-string diet/smoking/alcohol to null (explicit clear)', () => {
      const result = updateProfileSchema.safeParse({
        diet: '',
        smoking: '   ',
        alcohol: '',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.diet).toBeNull();
        expect(result.data.smoking).toBeNull();
        expect(result.data.alcohol).toBeNull();
      }
    });

    it('should accept valid diet and null smoking/alcohol on update', () => {
      const result = updateProfileSchema.safeParse({
        diet: 'Vegan',
        smoking: null,
        alcohol: null,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.diet).toBe('Vegan');
        expect(result.data.smoking).toBeNull();
        expect(result.data.alcohol).toBeNull();
      }
    });

    it('should accept null clears for family fields', () => {
      const result = updateProfileSchema.safeParse({
        familyStatus: null,
        familyValues: null,
        familyType: null,
        fatherOccupation: null,
        motherOccupation: null,
        brothersCount: 2,
        sistersCount: 1,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.familyStatus).toBeNull();
        expect(result.data.familyValues).toBeNull();
        expect(result.data.familyType).toBeNull();
        expect(result.data.fatherOccupation).toBeNull();
        expect(result.data.motherOccupation).toBeNull();
        expect(result.data.brothersCount).toBe(2);
        expect(result.data.sistersCount).toBe(1);
      }
    });

    it('should accept valid family enums and status on update', () => {
      const result = updateProfileSchema.safeParse({
        familyType: 'Extended',
        familyValues: 'Traditional',
        familyStatus: 'Upper middle class',
        fatherOccupation: 'Retired',
        motherOccupation: 'Homemaker',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.familyType).toBe('Extended');
        expect(result.data.familyStatus).toBe('Upper middle class');
        expect(result.data.fatherOccupation).toBe('Retired');
      }
    });

    it('should reject invalid parent occupation enum on update', () => {
      const result = updateProfileSchema.safeParse({
        fatherOccupation: 'Software Engineer',
      });
      expect(result.success).toBe(false);
    });

    it('accepts identity physical attributes on update', () => {
      const result = updateProfileSchema.safeParse({
        weightKg: 62,
        complexion: 'Fair',
        disability: null,
        profileFor: 'Myself',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.weightKg).toBe(62);
        expect(result.data.complexion).toBe('Fair');
        expect(result.data.disability).toBeNull();
      }
    });

    it('rejects invalid gender instead of dropping it', () => {
      const result = updateProfileSchema.safeParse({
        aboutMe: 'Keep me',
        gender: 'Prefer not to say',
      });
      expect(result.success).toBe(false);
    });

    it('accepts curated profileFor values and rejects free-text', () => {
      expect(updateProfileSchema.safeParse({ profileFor: 'Brother' }).success).toBe(true);
      expect(updateProfileSchema.safeParse({ profileFor: 'Friend' }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ profileFor: '' }).success).toBe(true); // coerced away
    });

    it('rejects partial DOB updates', () => {
      const result = updateProfileSchema.safeParse({
        dobDay: '15',
        dobMonth: '06',
      });
      expect(result.success).toBe(false);
    });

    it('rejects underage DOB when gender is included on update', () => {
      const result = updateProfileSchema.safeParse({
        gender: 'Male',
        dobDay: '01',
        dobMonth: '01',
        dobYear: '2010',
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid identity basics on update', () => {
      const result = updateProfileSchema.safeParse({
        profileFor: 'Daughter',
        fullName: 'Ananya Sharma',
        gender: 'Female',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1998',
      });
      expect(result.success).toBe(true);
    });

    it('strips createdBy from update payloads (member must not write it)', () => {
      const result = updateProfileSchema.safeParse({
        aboutMe: 'Hello',
        createdBy: 'staff',
      } as any);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).createdBy).toBeUndefined();
      }
    });

    it('rejects free-text maritalStatus on update', () => {
      expect(updateProfileSchema.safeParse({ maritalStatus: 'Separated' }).success).toBe(false);
    });

    it('rejects Divorced update without children answers', () => {
      expect(
        updateProfileSchema.safeParse({ maritalStatus: 'Divorced' }).success,
      ).toBe(false);
    });

    it('accepts Divorced update with full children answers', () => {
      expect(
        updateProfileSchema.safeParse({
          maritalStatus: 'Divorced',
          hasChildren: true,
          childrenCount: 2,
          childrenLivingWithMe: false,
        }).success,
      ).toBe(true);
    });

    it('accepts Never Married update that clears children flags', () => {
      expect(
        updateProfileSchema.safeParse({
          maritalStatus: 'Never Married',
          hasChildren: false,
          childrenCount: 0,
          childrenLivingWithMe: null,
        }).success,
      ).toBe(true);
    });
  });

  describe('step2IdentitySchema / completeRegistration identity', () => {
    it('rejects invalid profileFor on registration', () => {
      const result = step2IdentitySchema.safeParse({
        profileFor: 'Cousin',
        fullName: 'Karthik Loganathan',
        gender: 'Male',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1995',
        maritalStatus: 'Never Married',
        heightCm: 175,
      });
      expect(result.success).toBe(false);
    });

    it.each(['Myself', 'Son', 'Daughter', 'Brother', 'Sister', 'Relative'] as const)(
      'accepts curated profileFor=%s on registration and update',
      (profileFor) => {
        const base = {
          fullName: 'Karthik Loganathan',
          gender: 'Male' as const,
          dobDay: '15',
          dobMonth: '06',
          dobYear: '1995',
          maritalStatus: 'Never Married' as const,
        };
        expect(step2IdentitySchema.safeParse({ ...base, profileFor }).success).toBe(true);
        expect(updateProfileSchema.safeParse({ profileFor }).success).toBe(true);
      },
    );

    it('requires profileFor on registration (no empty default)', () => {
      const result = step2IdentitySchema.safeParse({
        profileFor: '',
        fullName: 'Karthik Loganathan',
        gender: 'Male',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1995',
        maritalStatus: 'Never Married',
      });
      expect(result.success).toBe(false);
    });

    it.each([
      ['non-leap Feb 29', { dobDay: '29', dobMonth: '02', dobYear: '2023' }],
      ['Feb 30', { dobDay: '30', dobMonth: '02', dobYear: '2000' }],
      ['April 31', { dobDay: '31', dobMonth: '04', dobYear: '1998' }],
    ])('rejects impossible date %s on register and update', (_label, dob) => {
      const register = step2IdentitySchema.safeParse({
        profileFor: 'Myself',
        fullName: 'Ananya Sharma',
        gender: 'Female',
        maritalStatus: 'Never Married',
        ...dob,
      });
      expect(register.success).toBe(false);

      const update = updateProfileSchema.safeParse({ gender: 'Female', ...dob });
      expect(update.success).toBe(false);
    });

    it('accepts leap-day birthday (Feb 29 2000)', () => {
      const result = step2IdentitySchema.safeParse({
        profileFor: 'Myself',
        fullName: 'Ananya Sharma',
        gender: 'Female',
        dobDay: '29',
        dobMonth: '02',
        dobYear: '2000',
        maritalStatus: 'Never Married',
      });
      expect(result.success).toBe(true);
    });

    it('enforces gender-based minimum age at the boundary', () => {
      // Exactly 18 today: OK for Female/Other, not for Male (needs 21).
      const eighteen = dobPartsYearsAgo(18);
      expect(
        step2IdentitySchema.safeParse({
          profileFor: 'Myself',
          fullName: 'Ananya Sharma',
          gender: 'Female',
          maritalStatus: 'Never Married',
          ...eighteen,
        }).success,
      ).toBe(true);
      expect(
        step2IdentitySchema.safeParse({
          profileFor: 'Myself',
          fullName: 'Ananya Sharma',
          gender: 'Other',
          maritalStatus: 'Never Married',
          ...eighteen,
        }).success,
      ).toBe(true);
      expect(
        step2IdentitySchema.safeParse({
          profileFor: 'Myself',
          fullName: 'Karthik Loganathan',
          gender: 'Male',
          maritalStatus: 'Never Married',
          ...eighteen,
        }).success,
      ).toBe(false);

      // Birthday tomorrow (still 17): rejected for Female.
      const almostEighteen = dobPartsYearsAgo(18, 1);
      expect(
        step2IdentitySchema.safeParse({
          profileFor: 'Myself',
          fullName: 'Ananya Sharma',
          gender: 'Female',
          maritalStatus: 'Never Married',
          ...almostEighteen,
        }).success,
      ).toBe(false);

      // Exactly 21 today: OK for Male.
      const twentyOne = dobPartsYearsAgo(21);
      expect(
        step2IdentitySchema.safeParse({
          profileFor: 'Myself',
          fullName: 'Karthik Loganathan',
          gender: 'Male',
          maritalStatus: 'Never Married',
          ...twentyOne,
        }).success,
      ).toBe(true);
    });

    it.each([
      ['too short', 'Al', false],
      ['with digits', 'Ananya123', false],
      ['max length', 'A'.repeat(100), true],
      ['over max length', 'A'.repeat(101), false],
    ])('fullName rule: %s', (_label, fullName, ok) => {
      const result = step2IdentitySchema.safeParse({
        profileFor: 'Myself',
        fullName,
        gender: 'Female',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1998',
        maritalStatus: 'Never Married',
      });
      expect(result.success).toBe(ok);
    });

    it('trims surrounding whitespace from fullName', () => {
      const result = step2IdentitySchema.safeParse({
        profileFor: 'Myself',
        fullName: '  Ananya Sharma  ',
        gender: 'Female',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1998',
        maritalStatus: 'Never Married',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.fullName).toBe('Ananya Sharma');
    });

    it('allows gender-only update without touching DOB', () => {
      expect(updateProfileSchema.safeParse({ gender: 'Other' }).success).toBe(true);
    });

    it('completeRegistrationSchema strips createdBy (register path)', () => {
      const result = completeRegistrationSchema.safeParse({
        profileFor: 'Myself',
        fullName: 'Ananya Sharma',
        gender: 'Female',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1998',
        maritalStatus: 'Never Married',
        city: 'Chennai',
        state: 'Tamil Nadu',
        religion: 'Hindu',
        caste: 'Brahmin',
        motherTongue: 'Tamil',
        familyValues: 'Moderate',
        familyType: 'Nuclear',
        fatherOccupation: 'Employed',
        motherOccupation: 'Homemaker',
        diet: 'Vegetarian',
        createdBy: 'staff',
      } as any);
      expect(result.success).toBe(true);
      if (result.success) expect((result.data as any).createdBy).toBeUndefined();
    });
  });
});
