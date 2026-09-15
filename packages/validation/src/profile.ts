import { z } from 'zod';

export const genderSchema = z.enum(['Male', 'Female', 'Other']);
export const maritalStatusSchema = z.enum(['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce']);
export const educationLevelSchema = z.enum(['Bachelors', 'Masters', 'Doctorate', 'Diploma', 'High School']);
export const employmentStatusSchema = z.enum(['Employed', 'Business Owner', 'Freelancer', 'Not Working']);
export const companySectorSchema = z.enum(['Private', 'Govt', 'MNC', 'Startup', 'Business']);
/** Accept omitted / empty string / null from forms; never pass "" to Postgres enums. */
export const optionalCompanySectorSchema = z.preprocess(
  (v) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v),
  companySectorSchema.optional(),
);
export const optionalEducationLevelSchema = z.preprocess(
  (v) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v),
  educationLevelSchema.optional(),
);
export const optionalEmploymentStatusSchema = z.preprocess(
  (v) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v),
  employmentStatusSchema.optional(),
);
export const photoPrivacySchema = z.enum(['blurred', 'accepted', 'visible']);
export const familyValuesSchema = z.enum(['Traditional', 'Moderate', 'Liberal']);
export const familyTypeSchema = z.enum(['Nuclear', 'Joint', 'Extended']);
export const parentOccupationSchema = z.enum(['Employed', 'Business', 'Retired', 'Homemaker', 'Passed Away']);
export const dietSchema = z.enum(['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Jain', 'Vegan']);
export const habitFrequencySchema = z.enum(['Never', 'Occasionally', 'Regularly', 'Planning to quit']);
export const manglikStatusSchema = z.enum(['Yes', 'No', "Don't Know", 'Both']);
export const govtIdTypeSchema = z.enum(['Aadhaar', 'PAN card', 'Passport', 'Driving licence', 'Voter ID']);

/** Full registration and update payload — empty strings and nulls for optional enums become undefined. */
const emptyToUndefined = (v: unknown) =>
  v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v;

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
    heightCm: z.number().int().min(120, 'Height must be at least 120 cm (3\'11")').max(230, 'Height must be under 230 cm (7\'6")').optional().nullable(),
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
  familyValues: z.preprocess(emptyToUndefined, familyValuesSchema.optional()),
  familyType: z.preprocess(emptyToUndefined, familyTypeSchema.optional()),
  familyStatus: z.string().optional().nullable(),
  fatherOccupation: z.preprocess(emptyToUndefined, parentOccupationSchema.optional()),
  motherOccupation: z.preprocess(emptyToUndefined, parentOccupationSchema.optional()),
  brothersCount: z.number().int().min(0).max(10).default(0),
  sistersCount: z.number().int().min(0).max(10).default(0),
});

// Step 4: Education & Career
export const step4CareerSchema = z.object({
  educationLevel: optionalEducationLevelSchema,
  degree: z.string().trim().optional(),
  collegeName: z.string().trim().optional(),
  employmentStatus: optionalEmploymentStatusSchema,
  profession: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  companySector: optionalCompanySectorSchema,
  annualIncome: z.string().optional(),
});

// Step 5: Lifestyle, Habits & Astrology
export const step5LifestyleAstrologySchema = z.object({
  diet: z.preprocess(emptyToUndefined, dietSchema.optional()),
  smoking: z.preprocess(emptyToUndefined, habitFrequencySchema.optional()),
  alcohol: z.preprocess(emptyToUndefined, habitFrequencySchema.optional()),
  interests: z.array(z.string()).max(7, 'Please select up to 7 interests maximum').default([]),
  birthTime: z.string().trim().min(1, 'Birth time is required'),
  birthPlace: z.string().trim().min(1, 'Birth place is required'),
  manglik: manglikStatusSchema,
  rashi: z.string().trim().min(1, 'Rashi is required'),
  nakshatra: z.string().trim().min(1, 'Star / nakshatra is required'),
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
export const updateProfileSchema = z
  .object({
    profileFor: z.string().optional(),
    fullName: z.string().trim().min(3).optional(),
    gender: genderSchema.optional(),
    dobDay: z.string().regex(/^(0[1-9]|[12]\d|3[01])$/).optional(),
    dobMonth: z.string().regex(/^(0[1-9]|1[0-2])$/).optional(),
    dobYear: z.string().regex(/^(19\d\d|20\d\d)$/).optional(),
    maritalStatus: maritalStatusSchema.optional(),
    hasChildren: z.boolean().optional().nullable(),
    childrenCount: z.number().int().min(0).optional().nullable(),
    childrenLivingWithMe: z.boolean().optional().nullable(),
    heightCm: z.number().int().min(120).max(230).optional().nullable(),
    weight: z.string().optional().nullable(),
    complexion: z.string().optional().nullable(),
    disability: z.string().optional().nullable(),
    aboutMe: z.string().max(1000).optional().nullable(),
    city: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    country: z.string().optional(),
    religion: z.string().optional(),
    caste: z.string().optional(),
    subcaste: z.string().optional().nullable(),
    gotra: z.string().optional().nullable(),
    motherTongue: z.string().optional(),
    educationLevel: optionalEducationLevelSchema.nullable(),
    degree: z.string().optional().nullable(),
    collegeName: z.string().optional().nullable(),
    employmentStatus: optionalEmploymentStatusSchema.nullable(),
    profession: z.string().optional().nullable(),
    companyName: z.string().optional().nullable(),
    companySector: optionalCompanySectorSchema.nullable(),
    annualIncome: z.string().optional().nullable(),
    photoPrivacy: photoPrivacySchema.optional(),
    diet: z.preprocess(emptyToUndefined, dietSchema.optional().nullable()),
    smoking: z.preprocess(emptyToUndefined, habitFrequencySchema.optional().nullable()),
    alcohol: z.preprocess(emptyToUndefined, habitFrequencySchema.optional().nullable()),
    interests: z.array(z.string()).max(7).optional(),
    familyValues: z.preprocess(emptyToUndefined, familyValuesSchema.optional().nullable()),
    familyType: z.preprocess(emptyToUndefined, familyTypeSchema.optional().nullable()),
    familyStatus: z.string().optional().nullable(),
    fatherOccupation: z.preprocess(emptyToUndefined, parentOccupationSchema.optional().nullable()),
    motherOccupation: z.preprocess(emptyToUndefined, parentOccupationSchema.optional().nullable()),
    brothersCount: z.number().int().min(0).optional().nullable(),
    sistersCount: z.number().int().min(0).optional().nullable(),
    birthTime: z.string().optional().nullable(),
    birthPlace: z.string().optional().nullable(),
    manglik: z.preprocess(emptyToUndefined, manglikStatusSchema.optional().nullable()),
    rashi: z.string().optional().nullable(),
    nakshatra: z.string().optional().nullable(),
    educationId: z.number().int().positive().optional().nullable(),
    specializationId: z.number().int().positive().optional().nullable(),
    occupationId: z.number().int().positive().optional().nullable(),
    companyId: z.number().int().positive().optional().nullable(),
    horoscopeS3Key: z.string().optional().nullable(),
    horoscopeFileName: z.string().optional().nullable(),
    horoscopeFileSizeBytes: z.number().optional().nullable(),
    prefAgeMin: z.number().int().min(18).max(80).optional(),
    prefAgeMax: z.number().int().min(18).max(80).optional(),
    prefHeightMinCm: z.number().int().optional().nullable(),
    prefHeightMaxCm: z.number().int().optional().nullable(),
    prefMaritalStatuses: z.array(z.string()).optional(),
    prefReligions: z.array(z.string()).optional(),
    prefCastes: z.array(z.string()).optional(),
    prefMotherTongues: z.array(z.string()).optional(),
    prefMinEducation: z.string().optional().nullable(),
    prefAcceptableIncomes: z.array(z.string()).optional(),
    prefLocations: z.array(z.string()).optional(),
    willingToRelocate: z.string().optional().nullable(),
  })
  .passthrough();

export const completeRegistrationSchema = step2IdentitySchema
  .and(step3CommunitySchema)
  .and(step4CareerSchema)
  .and(
    z.object({
      diet: z.preprocess(emptyToUndefined, dietSchema.optional()),
      smoking: z.preprocess(emptyToUndefined, habitFrequencySchema.optional()),
      alcohol: z.preprocess(emptyToUndefined, habitFrequencySchema.optional()),
      interests: z.array(z.string()).max(7).optional(),
      birthTime: z.preprocess(emptyToUndefined, z.string().optional()),
      birthPlace: z.preprocess(emptyToUndefined, z.string().optional()),
      manglik: z.preprocess(emptyToUndefined, manglikStatusSchema.optional()),
      rashi: z.preprocess(emptyToUndefined, z.string().optional()),
      nakshatra: z.preprocess(emptyToUndefined, z.string().optional()),
    }),
  )
  .and(
    z.object({
      phone: z.string().optional(),
      otp: z.string().optional(),
      consentAccepted: z.boolean().optional(),
      referredBy: z.string().optional(),
      educationId: z.number().int().positive().optional().nullable(),
      specializationId: z.number().int().positive().optional().nullable(),
      occupationId: z.number().int().positive().optional().nullable(),
      companyId: z.number().int().positive().optional().nullable(),
      prefAgeMin: z.number().int().min(18).max(80).optional(),
      prefAgeMax: z.number().int().min(18).max(80).optional(),
      prefHeightMinCm: z.number().int().optional(),
      prefHeightMaxCm: z.number().int().optional(),
      prefMaritalStatuses: z.array(z.string()).optional(),
      prefReligions: z.array(z.string()).optional(),
      prefCastes: z.array(z.string()).optional(),
      prefMotherTongues: z.array(z.string()).optional(),
      prefMinEducation: z.string().optional(),
      prefAcceptableIncomes: z.array(z.string()).optional(),
      prefLocations: z.array(z.string()).optional(),
      photoS3Keys: z.array(z.string()).optional(),
      photoPrivacy: z.preprocess(emptyToUndefined, photoPrivacySchema.optional()),
      verificationMethod: z.preprocess(
        emptyToUndefined,
        z.enum(['selfie', 'govt_id']).optional(),
      ),
      selfieS3Key: z.string().optional().nullable().or(z.literal('')),
      govtIdType: z.preprocess(emptyToUndefined, govtIdTypeSchema.optional().nullable()),
      govtIdS3Key: z.string().optional().nullable().or(z.literal('')),
      horoscopeS3Key: z.string().optional().nullable().or(z.literal('')),
      horoscopeFileName: z.string().optional().nullable().or(z.literal('')),
      horoscopeFileSizeBytes: z.number().optional().nullable(),
    }),
  );
