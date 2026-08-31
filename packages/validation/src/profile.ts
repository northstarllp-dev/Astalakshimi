import { z } from 'zod';

export const genderSchema = z.enum(['Male', 'Female', 'Other']);
export const maritalStatusSchema = z.enum(['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce']);
export const educationLevelSchema = z.enum(['Bachelors', 'Masters', 'Doctorate', 'Diploma', 'High School']);
export const employmentStatusSchema = z.enum(['Employed', 'Business Owner', 'Freelancer', 'Not Working']);
export const companySectorSchema = z.enum(['Private', 'Govt', 'MNC', 'Startup', 'Business']);
export const photoPrivacySchema = z.enum(['blurred', 'accepted', 'visible']);
export const familyValuesSchema = z.enum(['Traditional', 'Moderate', 'Liberal']);
export const familyTypeSchema = z.enum(['Nuclear', 'Joint', 'Extended']);
export const parentOccupationSchema = z.enum(['Employed', 'Business', 'Retired', 'Homemaker', 'Passed Away']);
export const dietSchema = z.enum(['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Jain', 'Vegan']);
export const habitFrequencySchema = z.enum(['Never', 'Occasionally', 'Regularly', 'Planning to quit']);
export const manglikStatusSchema = z.enum(['Yes', 'No', "Don't Know", 'Both']);
export const govtIdTypeSchema = z.enum(['Aadhaar', 'PAN card', 'Passport', 'Driving licence', 'Voter ID']);

// Step 2: Identity & Physical
export const step2IdentitySchema = z
  .object({
    profileFor: z.string().min(1, 'Please select who this profile is for'),
    fullName: z
      .string()
      .trim()
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name is too long')
      .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters'),
    gender: genderSchema,
    dobDay: z.string().regex(/^(0[1-9]|[12]\d|3[01])$/, 'Valid day required (01-31)'),
    dobMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Valid month required (01-12)'),
    dobYear: z.string().regex(/^(19\d\d|20\d\d)$/, 'Valid 4-digit year required'),
    maritalStatus: maritalStatusSchema,
    hasChildren: z.boolean().optional(),
    childrenCount: z.number().int().min(0).max(10).optional(),
    childrenLivingWithMe: z.boolean().optional(),
    heightCm: z.number().int().min(120, 'Height must be at least 120 cm (3\'11")').max(230, 'Height must be under 230 cm (7\'6")'),
    aboutMe: z.string().max(1000, 'Bio cannot exceed 1000 characters').optional(),
  })
  .superRefine((data, ctx) => {
    // Validate Date and Age
    const year = parseInt(data.dobYear, 10);
    const month = parseInt(data.dobMonth, 10) - 1;
    const day = parseInt(data.dobDay, 10);
    const date = new Date(year, month, day);

    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dobDay'],
        message: 'Invalid date of birth',
      });
      return;
    }

    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }

    const minAge = data.gender === 'Male' ? 21 : 18;
    if (age < minAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dobYear'],
        message: `Must be at least ${minAge} years old (${data.gender})`,
      });
    }
  });

// Step 3: Location, Community & Family
export const step3CommunitySchema = z.object({
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  country: z.string().default('India'),
  religion: z.string().min(1, 'Religion is required'),
  caste: z.string().trim().min(2, 'Caste is required'),
  subcaste: z.string().trim().optional(),
  gotra: z.string().trim().optional(),
  motherTongue: z.string().min(1, 'Mother tongue is required'),
  familyValues: familyValuesSchema,
  familyType: familyTypeSchema,
  fatherOccupation: parentOccupationSchema,
  motherOccupation: parentOccupationSchema,
  brothersCount: z.number().int().min(0).max(10).default(0),
  sistersCount: z.number().int().min(0).max(10).default(0),
});

// Step 4: Education & Career
export const step4CareerSchema = z.object({
  educationLevel: educationLevelSchema.optional(),
  degree: z.string().trim().optional(),
  collegeName: z.string().trim().optional(),
  employmentStatus: employmentStatusSchema.optional(),
  profession: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  companySector: companySectorSchema.optional(),
  annualIncome: z.string().optional(),
});

// Step 5: Lifestyle, Habits & Astrology
export const step5LifestyleAstrologySchema = z.object({
  diet: dietSchema,
  smoking: habitFrequencySchema.default('Never'),
  alcohol: habitFrequencySchema.default('Never'),
  interests: z.array(z.string()).max(7, 'Please select up to 7 interests maximum').default([]),
  birthTime: z.string().optional(),
  birthPlace: z.string().optional(),
  manglik: manglikStatusSchema.default("Don't Know"),
  rashi: z.string().optional(),
  nakshatra: z.string().optional(),
});

// Step 6: Photos & Verification
export const step6VerificationSchema = z
  .object({
    photoS3Keys: z.array(z.string()).min(1, 'At least 1 profile photo is required').max(6, 'Maximum 6 photos allowed'),
    photoPrivacy: photoPrivacySchema.default('blurred'),
    verificationMethod: z.enum(['selfie', 'govt_id']),
    selfieS3Key: z.string().optional().nullable().or(z.literal('')),
    govtIdType: govtIdTypeSchema.optional().nullable().or(z.literal('')),
    govtIdS3Key: z.string().optional().nullable().or(z.literal('')),
    horoscopeS3Key: z.string().optional().nullable().or(z.literal('')),
    horoscopeFileName: z.string().optional().nullable().or(z.literal('')),
    horoscopeFileSizeBytes: z.number().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.verificationMethod === 'selfie' && (!data.selfieS3Key || data.selfieS3Key.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selfieS3Key'],
        message: 'Live selfie photo is required when choosing selfie verification',
      });
    }
    if (data.verificationMethod === 'govt_id') {
      if (!data.govtIdType || data.govtIdType.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['govtIdType'],
          message: 'Government ID type is required',
        });
      }
      if (!data.govtIdS3Key || data.govtIdS3Key.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['govtIdS3Key'],
          message: 'Government ID photo is required',
        });
      }
    }
  });

// Complete Profile Update Schema (for editing after registration)
export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(3).optional(),
  maritalStatus: maritalStatusSchema.optional(),
  hasChildren: z.boolean().optional(),
  childrenCount: z.number().int().min(0).optional(),
  childrenLivingWithMe: z.boolean().optional(),
  heightCm: z.number().int().min(120).max(230).optional(),
  aboutMe: z.string().max(1000).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  religion: z.string().optional(),
  caste: z.string().optional(),
  subcaste: z.string().optional(),
  gotra: z.string().optional(),
  motherTongue: z.string().optional(),
  educationLevel: educationLevelSchema.optional(),
  degree: z.string().optional(),
  collegeName: z.string().optional(),
  employmentStatus: employmentStatusSchema.optional(),
  profession: z.string().optional(),
  companyName: z.string().optional(),
  companySector: companySectorSchema.optional(),
  annualIncome: z.string().optional(),
  photoPrivacy: photoPrivacySchema.optional(),
  diet: dietSchema.optional(),
  smoking: habitFrequencySchema.optional(),
  alcohol: habitFrequencySchema.optional(),
  interests: z.array(z.string()).max(7).optional(),
  familyValues: familyValuesSchema.optional(),
  familyType: familyTypeSchema.optional(),
  fatherOccupation: parentOccupationSchema.optional(),
  motherOccupation: parentOccupationSchema.optional(),
  brothersCount: z.number().int().min(0).optional(),
  sistersCount: z.number().int().min(0).optional(),
  birthTime: z.string().optional(),
  birthPlace: z.string().optional(),
  manglik: manglikStatusSchema.optional(),
  rashi: z.string().optional(),
  nakshatra: z.string().optional(),
});
