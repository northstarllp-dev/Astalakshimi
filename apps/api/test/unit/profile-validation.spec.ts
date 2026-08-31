import {
  step2IdentitySchema,
  step3CommunitySchema,
  step4CareerSchema,
  step5LifestyleAstrologySchema,
  step6VerificationSchema,
  updateProfileSchema,
} from '@astalakshimi/validation';

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
  });

  describe('step3CommunitySchema', () => {
    it('should validate complete community and family details', () => {
      const payload = {
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        religion: 'Hindu',
        caste: 'Brahmin - Iyer',
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

    it('should reject missing required career fields', () => {
      const payload = {
        educationLevel: 'Bachelors' as const,
        degree: '',
        employmentStatus: 'Employed' as const,
        profession: '',
        annualIncome: '',
      };

      const result = step4CareerSchema.safeParse(payload);
      expect(result.success).toBe(false);
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
  });
});
