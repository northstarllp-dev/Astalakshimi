import { z } from 'zod';

export const genderSchema = z.enum(['Male', 'Female', 'Other']);
export const PROFILE_FOR_VALUES = [
  'Myself',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Relative',
] as const;
export const profileForSchema = z.enum(PROFILE_FOR_VALUES);
export const MARITAL_STATUS_VALUES = [
  'Never Married',
  'Divorced',
  'Widowed',
  'Awaiting Divorce',
] as const;
export const maritalStatusSchema = z.enum(MARITAL_STATUS_VALUES);
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

/** PATCH: omit → unchanged; "" / null → clear to NULL; valid enum kept. */
const optionalNullableEnum = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => {
    if (v === undefined) return undefined;
    if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
    return typeof v === 'string' ? v.trim() : v;
  }, schema.nullable().optional());
export const photoPrivacySchema = z.enum(['blurred', 'accepted', 'visible']);
export const complexionSchema = z.enum(['Very fair', 'Fair', 'Wheatish', 'Wheatish brown', 'Dark']);
export const familyValuesSchema = z.enum(['Traditional', 'Moderate', 'Liberal']);
export const familyTypeSchema = z.enum(['Nuclear', 'Joint', 'Extended']);
export const parentOccupationSchema = z.enum(['Employed', 'Business', 'Retired', 'Homemaker', 'Passed Away']);
export const dietSchema = z.enum(['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Jain', 'Vegan']);
export const habitFrequencySchema = z.enum(['Never', 'Occasionally', 'Regularly', 'Planning to quit']);
export const manglikStatusSchema = z.enum(['Yes', 'No', "Don't Know", 'Both']);
export const govtIdTypeSchema = z.enum(['Aadhaar', 'PAN card', 'Passport', 'Driving licence', 'Voter ID']);

export const MARITAL_STATUSES_WITH_CHILDREN = ['Divorced', 'Widowed'] as const;

export function maritalAsksChildren(status?: string | null): boolean {
  return status === 'Divorced' || status === 'Widowed';
}

/**
 * Canonical children shape for DB writes. Call only after Zod has validated
 * the Divorced/Widowed + hasChildren rules (no silent junk defaults for living-with).
 */
export function resolveChildrenFields(input: {
  maritalStatus?: string | null;
  hasChildren?: boolean | null;
  childrenCount?: number | null;
  childrenLivingWithMe?: boolean | null;
}): { hasChildren: boolean; childrenCount: number; childrenLivingWithMe: boolean | null } {
  if (!maritalAsksChildren(input.maritalStatus)) {
    return { hasChildren: false, childrenCount: 0, childrenLivingWithMe: null };
  }
  if (!input.hasChildren) {
    return { hasChildren: false, childrenCount: 0, childrenLivingWithMe: null };
  }
  const count = input.childrenCount ?? 0;
  return {
    hasChildren: true,
    childrenCount: Math.min(10, Math.max(1, count)),
    // Preserve explicit false; only null when caller omitted (should not happen post-Zod).
    childrenLivingWithMe:
      input.childrenLivingWithMe === true
        ? true
        : input.childrenLivingWithMe === false
          ? false
          : null,
  };
}

/** Shared refine for register + update when marital status asks about children. */
export function refineChildrenFields(
  data: {
    maritalStatus?: string | null;
    hasChildren?: boolean | null;
    childrenCount?: number | null;
    childrenLivingWithMe?: boolean | null;
  },
  ctx: z.RefinementCtx,
  /** When true, only refine if children-related keys (or maritalStatus) are present. */
  options?: { onlyWhenTouched?: boolean },
) {
  if (options?.onlyWhenTouched) {
    const touched =
      data.maritalStatus !== undefined ||
      data.hasChildren !== undefined ||
      data.childrenCount !== undefined ||
      data.childrenLivingWithMe !== undefined;
    if (!touched) return;
  }

  if (!data.maritalStatus || !maritalAsksChildren(data.maritalStatus)) return;

  if (data.hasChildren === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['hasChildren'],
      message: 'Please say whether there are children',
    });
    return;
  }

  if (!data.hasChildren) return;

  if (data.childrenCount == null || data.childrenCount < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['childrenCount'],
      message: 'Enter how many children',
    });
  }
  if (data.childrenLivingWithMe === undefined || data.childrenLivingWithMe === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['childrenLivingWithMe'],
      message: 'Please say if the children live with you',
    });
  }
}

/** Empty string → undefined so optional enums / strings don't fail or hit Postgres. */
const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

/**
 * Optional varchar on PATCH: omit → leave unchanged; "" / null → clear to NULL.
 * Mirrors the subcaste/gotra preprocess so free-text career fields can be cleared.
 */
const optionalNullableText = (max = 200) =>
  z.preprocess((v) => {
    if (v === undefined) return undefined;
    if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
    return typeof v === 'string' ? v.trim() : v;
  }, z.string().max(max).nullable().optional());

// Step 2: Identity & Physical
export const step2IdentitySchema = z
  .object({
    profileFor: profileForSchema,
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
    // null when Never Married / no children (see resolveChildrenFields)
    childrenLivingWithMe: z.boolean().nullable().optional(),
    heightCm: z.number().int().min(120, 'Height must be at least 120 cm (3\'11")').max(230, 'Height must be under 230 cm (7\'6")').optional().nullable(),
    aboutMe: z.string().max(1000, 'Bio cannot exceed 1000 characters').optional(),
  })
  .superRefine((data, ctx) => {
    refineDobAge(data.dobDay, data.dobMonth, data.dobYear, data.gender, ctx);
    refineChildrenFields(data, ctx);
  });

const dobPartRegex = {
  day: /^(0[1-9]|[12]\d|3[01])$/,
  month: /^(0[1-9]|1[0-2])$/,
  year: /^(19\d\d|20\d\d)$/,
};

function refineDobAge(
  dobDay: string,
  dobMonth: string,
  dobYear: string,
  gender: string | undefined,
  ctx: z.RefinementCtx,
) {
  const year = parseInt(dobYear, 10);
  const month = parseInt(dobMonth, 10) - 1;
  const day = parseInt(dobDay, 10);
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dobDay'],
      message: 'Invalid date of birth',
    });
    return;
  }

  if (!gender) return;

  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }

  const minAge = gender === 'Male' ? 21 : 18;
  if (age < minAge) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dobYear'],
      message: `Must be at least ${minAge} years old (${gender})`,
    });
  }
}

// Step 3: Location, Community & Family
export const step3CommunitySchema = z.object({
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  country: z.string().default('India'),
  citySlug: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  willingToRelocate: z.preprocess(emptyToUndefined, z.string().optional()),
  religion: z.string().min(1, 'Religion is required'),
  caste: z.string().trim().min(2, 'Caste is required'),
  communitySlug: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  subcaste: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  gotra: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
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
    photoContentHashes: z.array(z.string().length(64)).max(6).optional(),
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

/** Soft enum: invalid free-text from edit forms is dropped instead of 400ing the whole save. */
function softOptionalEnum<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => {
    if (v == null || (typeof v === 'string' && v.trim() === '')) return undefined;
    const parsed = schema.safeParse(typeof v === 'string' ? v.trim() : v);
    return parsed.success ? parsed.data : undefined;
  }, schema.optional());
}

const manglikUpdateSchema = z.preprocess((v) => {
  if (typeof v === 'string' && v.trim().toLowerCase() === "don't know") return "Don't Know";
  return emptyToUndefined(v);
}, manglikStatusSchema.optional());

// Complete Profile Update Schema (for editing after registration)
export const updateProfileSchema = z
  .object({
    profileFor: z.preprocess(emptyToUndefined, profileForSchema.optional()),
    fullName: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .min(3)
        .max(100)
        .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters')
        .optional(),
    ),
    gender: z.preprocess(emptyToUndefined, genderSchema.optional()),
    dobDay: z.preprocess(emptyToUndefined, z.string().regex(dobPartRegex.day).optional()),
    dobMonth: z.preprocess(emptyToUndefined, z.string().regex(dobPartRegex.month).optional()),
    dobYear: z.preprocess(emptyToUndefined, z.string().regex(dobPartRegex.year).optional()),
    maritalStatus: z.preprocess(emptyToUndefined, maritalStatusSchema.optional()),
    hasChildren: z.boolean().optional(),
    childrenCount: z.number().int().min(0).max(10).optional(),
    childrenLivingWithMe: z.boolean().nullable().optional(),
    heightCm: z.number().int().min(120).max(230).optional(),
    aboutMe: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
    weightKg: z.number().int().min(30).max(200).nullable().optional(),
    complexion: z.preprocess((v) => {
      if (v === undefined) return undefined;
      if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
      return v;
    }, complexionSchema.nullable().optional()),
    disability: z.preprocess((v) => {
      if (v === undefined) return undefined;
      if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
      return typeof v === 'string' ? v.trim() : v;
    }, z.string().max(500).nullable().optional()),
    city: z.preprocess(emptyToUndefined, z.string().min(2).optional()),
    state: z.preprocess(emptyToUndefined, z.string().min(2).optional()),
    country: z.preprocess(emptyToUndefined, z.string().optional()),
    citySlug: z.preprocess((v) => {
      if (v === undefined) return undefined;
      if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
      return typeof v === 'string' ? v.trim() : v;
    }, z.string().max(120).nullable().optional()),
    willingToRelocate: z.preprocess((v) => {
      if (v === undefined) return undefined;
      if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
      return typeof v === 'string' ? v.trim() : v;
    }, z.string().nullable().optional()),
    religion: z.preprocess(emptyToUndefined, z.string().optional()),
    caste: z.preprocess(emptyToUndefined, z.string().optional()),
    communitySlug: z.preprocess((v) => {
      if (v === undefined) return undefined;
      if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
      return typeof v === 'string' ? v.trim() : v;
    }, z.string().max(120).nullable().optional()),
    subcaste: z.preprocess((v) => {
      if (v === undefined) return undefined;
      if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
      return typeof v === 'string' ? v.trim() : v;
    }, z.string().max(100).nullable().optional()),
    gotra: z.preprocess((v) => {
      if (v === undefined) return undefined;
      if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
      return typeof v === 'string' ? v.trim() : v;
    }, z.string().max(100).nullable().optional()),
    motherTongue: z.preprocess(emptyToUndefined, z.string().optional()),
    educationLevel: optionalNullableEnum(educationLevelSchema),
    degree: optionalNullableText(150),
    collegeName: optionalNullableText(200),
    employmentStatus: optionalNullableEnum(employmentStatusSchema),
    profession: optionalNullableText(150),
    companyName: optionalNullableText(150),
    companySector: optionalNullableEnum(companySectorSchema),
    annualIncome: optionalNullableText(50),
    photoPrivacy: softOptionalEnum(photoPrivacySchema),
    diet: optionalNullableEnum(dietSchema),
    smoking: optionalNullableEnum(habitFrequencySchema),
    alcohol: optionalNullableEnum(habitFrequencySchema),
    interests: z.array(z.string().max(60)).max(7).optional(),
    familyValues: optionalNullableEnum(familyValuesSchema),
    familyType: optionalNullableEnum(familyTypeSchema),
    familyStatus: optionalNullableText(50),
    fatherOccupation: optionalNullableEnum(parentOccupationSchema),
    motherOccupation: optionalNullableEnum(parentOccupationSchema),
    brothersCount: z.number().int().min(0).optional(),
    sistersCount: z.number().int().min(0).optional(),
    // Horoscope text fields: blank / null → NULL so PATCH can clear them.
    birthTime: optionalNullableText(20),
    birthPlace: optionalNullableText(100),
    manglik: manglikUpdateSchema, // NOT NULL enum — empty omits; never null
    rashi: optionalNullableText(50),
    nakshatra: optionalNullableText(50),
    horoscopeS3Key: optionalNullableText(500),
    horoscopeFileName: optionalNullableText(255),
    horoscopeFileSizeBytes: z.preprocess((v) => {
      if (v === undefined) return undefined;
      if (v == null || v === '' || v === 0) return null;
      return v;
    }, z.number().int().nonnegative().nullable().optional()),
    prefAgeMin: z.number().int().min(18).max(80).optional(),
    prefAgeMax: z.number().int().min(18).max(80).optional(),
    prefHeightMinCm: z.number().int().optional(),
    prefHeightMaxCm: z.number().int().optional(),
    prefMaritalStatuses: z.array(z.string()).optional(),
    prefReligions: z.array(z.string()).optional(),
    prefCastes: z.array(z.string()).optional(),
    prefMotherTongues: z.array(z.string()).optional(),
    prefMinEducation: optionalNullableText(50),
    prefAcceptableIncomes: z.array(z.string()).optional(),
    prefLocations: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    const dobTouched =
      data.dobDay !== undefined || data.dobMonth !== undefined || data.dobYear !== undefined;
    if (dobTouched) {
      if (!data.dobDay || !data.dobMonth || !data.dobYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dobDay'],
          message: 'Date of birth requires day, month, and year together',
        });
      } else {
        // Age check when gender is in the same payload; service re-checks with stored gender otherwise.
        refineDobAge(data.dobDay, data.dobMonth, data.dobYear, data.gender, ctx);
      }
    }

    // Children rules when marital/children fields are being patched (service merges stored marital).
    refineChildrenFields(data, ctx, { onlyWhenTouched: true });

    // Partner-preference ranges: only validate when both ends are present.
    if (
      data.prefAgeMin !== undefined &&
      data.prefAgeMax !== undefined &&
      data.prefAgeMin > data.prefAgeMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prefAgeMax'],
        message: 'Max age must be greater than or equal to min age',
      });
    }
    if (
      data.prefHeightMinCm !== undefined &&
      data.prefHeightMaxCm !== undefined &&
      data.prefHeightMinCm > data.prefHeightMaxCm
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prefHeightMaxCm'],
        message: 'Max height must be greater than or equal to min height',
      });
    }
  });

/** Full registration payload — empty strings for optional enums become undefined. */
export const completeRegistrationSchema = step2IdentitySchema
  .and(step3CommunitySchema)
  .and(step4CareerSchema)
  .and(
    z.object({
      // Diet is required at registration (culturally critical for matching).
      // Smoking / alcohol / interests are NOT collected at registration — they
      // default to NULL / [] in the DB and are filled later via /profile/edit.
      diet: dietSchema,
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
      weightKg: z.number().int().min(30).max(200).optional().nullable(),
      complexion: z.preprocess((v) => {
        if (v === undefined) return undefined;
        if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
        return v;
      }, complexionSchema.nullable().optional()),
      disability: z.preprocess((v) => {
        if (v === undefined) return undefined;
        if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
        return typeof v === 'string' ? v.trim() : v;
      }, z.string().max(500).optional().nullable()),
      // Partner preferences are collected in the signup wizard (step 5). The age
      // range and preferred religion feed the match engine's hard filters, so a
      // registration must carry real values instead of service-side defaults.
      prefAgeMin: z.number().int().min(18).max(80),
      prefAgeMax: z.number().int().min(18).max(80),
      prefHeightMinCm: z.number().int().min(120).max(230).optional(),
      prefHeightMaxCm: z.number().int().min(120).max(230).optional(),
      prefMaritalStatuses: z.array(z.string()).optional(),
      prefReligions: z.array(z.string()).min(1, 'Select at least one preferred religion'),
      prefCastes: z.array(z.string()).optional(),
      prefMotherTongues: z.array(z.string()).optional(),
      prefMinEducation: z.string().optional(),
      prefAcceptableIncomes: z.array(z.string()).optional(),
      prefLocations: z.array(z.string()).optional(),
      photoS3Keys: z.array(z.string()).optional(),
      photoContentHashes: z.array(z.string().length(64)).optional(),
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
  )
  .superRefine((data, ctx) => {
    // Partner-preference ranges must be coherent: an inverted window leaves the
    // match engine with an empty candidate pool, so reject it at registration.
    if (data.prefAgeMin > data.prefAgeMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prefAgeMax'],
        message: 'Max age must be greater than or equal to min age',
      });
    }
    if (
      data.prefHeightMinCm !== undefined &&
      data.prefHeightMaxCm !== undefined &&
      data.prefHeightMinCm > data.prefHeightMaxCm
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prefHeightMaxCm'],
        message: 'Max height must be greater than or equal to min height',
      });
    }
  });
