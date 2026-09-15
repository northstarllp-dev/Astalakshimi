export type Gender = 'Male' | 'Female' | 'Other';
export type MaritalStatus = 'Never Married' | 'Divorced' | 'Widowed' | 'Awaiting Divorce';
export type EducationLevel = 'Bachelors' | 'Masters' | 'Doctorate' | 'Diploma' | 'High School';
export type EmploymentStatus = 'Employed' | 'Business Owner' | 'Freelancer' | 'Not Working';
export type CompanySector = 'Private' | 'Govt' | 'MNC' | 'Startup' | 'Business';
export type PhotoPrivacy = 'blurred' | 'accepted' | 'visible';

export type FamilyValues = 'Traditional' | 'Moderate' | 'Liberal';
export type FamilyType = 'Nuclear' | 'Joint' | 'Extended';
export type ParentOccupation = 'Employed' | 'Business' | 'Retired' | 'Homemaker' | 'Passed Away';

export type Diet = 'Vegetarian' | 'Non-vegetarian' | 'Eggetarian' | 'Jain' | 'Vegan';
export type HabitFrequency = 'Never' | 'Occasionally' | 'Regularly' | 'Planning to quit';

export type ManglikStatus = 'Yes' | 'No' | "Don't Know" | 'Both';

export interface Profile {
  id: string;
  userId: string;
  profileFor: string;
  fullName: string;
  gender: Gender;
  dob: string; // YYYY-MM-DD
  maritalStatus: MaritalStatus;
  hasChildren?: boolean;
  childrenCount?: number;
  childrenLivingWithMe?: boolean | null;
  heightCm: number;
  weight?: string | null;
  complexion?: string | null;
  disability?: string | null;
  aboutMe?: string | null;
  city: string;
  state: string;
  country: string;
  willingToRelocate?: string | null;
  religion: string;
  caste: string;
  subcaste?: string | null;
  gotra?: string | null;
  motherTongue: string;
  educationId?: number | null;
  specializationId?: number | null;
  specializationName?: string | null;
  educationLevel?: EducationLevel | null;
  degree?: string | null;
  collegeName?: string | null;
  employmentStatus?: EmploymentStatus | null;
  profession?: string | null;
  occupationId?: number | null;
  companyId?: number | null;
  companyName?: string | null;
  companySector?: CompanySector | null;
  annualIncome?: string | null;
  photoPrivacy: PhotoPrivacy;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyDetails {
  id: string;
  profileId: string;
  familyValues: FamilyValues;
  familyType: FamilyType;
  familyStatus?: string | null;
  fatherOccupation: ParentOccupation;
  motherOccupation: ParentOccupation;
  brothersCount: number;
  sistersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LifestyleInterests {
  id: string;
  profileId: string;
  diet: Diet;
  smoking: HabitFrequency;
  alcohol: HabitFrequency;
  interests: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Horoscope {
  id: string;
  profileId: string;
  birthTime?: string | null;
  birthPlace?: string | null;
  manglik: ManglikStatus;
  rashi?: string | null;
  nakshatra?: string | null;
  horoscopeS3Key?: string | null;
  horoscopeFileName?: string | null;
  horoscopeFileSizeBytes?: number | null;
  createdAt: string;
  updatedAt: string;
}

// Complete profile composite for match views & dashboard
export interface FullProfileView {
  profile: Profile;
  family?: FamilyDetails | null;
  lifestyle?: LifestyleInterests | null;
  horoscope?: Horoscope | null;
  partnerPreferences?: any | null;
  verification?: any | null;
  photos: {
    id: string;
    s3Key: string;
    url?: string;
    isPrimary: boolean;
    displayOrder: number;
  }[];
  verificationStatus: 'idle' | 'pending' | 'verified' | 'rejected';
  blurPhoto?: boolean;
  /** True only when an actual verification review came back `verified`. */
  isVerified?: boolean;
  photoVerified?: boolean;
  isMutualConnect?: boolean;
  contactPhone?: string | null;
  hasHoroscope?: boolean;
  contactAccess?: {
    canView: boolean;
    isUnlocked: boolean;
    isMutualBenefit: boolean;
    limit: number | null;
    usedThisMonth: number;
    remaining: number | null;
    canUnlockWithQuota: boolean;
    canPayExtra: boolean;
    extraContactFeePaise: number;
    planSlug: string;
  };
}

export type ContactAccess = NonNullable<FullProfileView['contactAccess']>;

// Complete registration submission payload (Steps 1–6)
export interface CompleteRegistrationPayload {
  // Step 1: Auth & Consent
  phone: string;
  otp: string;
  consentAccepted: boolean;
  referredBy?: string;

  // Step 2: Identity & Physical
  profileFor: string;
  fullName: string;
  gender: Gender;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  maritalStatus: MaritalStatus;
  hasChildren?: boolean;
  childrenCount?: number;
  childrenLivingWithMe?: boolean;
  heightCm: number;
  weight?: string | null;
  complexion?: string | null;
  disability?: string | null;
  aboutMe?: string;

  // Step 3: Location & Community
  city: string;
  state: string;
  country?: string;
  willingToRelocate?: string | null;
  religion: string;
  caste: string;
  subcaste?: string | null;
  gotra?: string | null;
  motherTongue: string;

  // Step 4: Education & Career
  educationId?: number | null;
  specializationId?: number | null;
  educationLevel?: EducationLevel | null;
  degree?: string | null;
  collegeName?: string | null;
  employmentStatus?: EmploymentStatus | null;
  profession?: string | null;
  occupationId?: number | null;
  companyId?: number | null;
  companyName?: string | null;
  companySector?: CompanySector | null;
  annualIncome?: string | null;

  // Step 4: Family Details
  familyValues: FamilyValues;
  familyType: FamilyType;
  familyStatus?: string | null;
  fatherOccupation: ParentOccupation;
  motherOccupation: ParentOccupation;
  brothersCount: number;
  sistersCount: number;

  // Step 5: Lifestyle & Astrology
  diet: Diet;
  smoking?: HabitFrequency | null;
  alcohol?: HabitFrequency | null;
  interests?: string[];
  birthTime?: string | null;
  birthPlace?: string | null;
  manglik?: ManglikStatus | null;
  rashi?: string | null;
  nakshatra?: string | null;

  // Step 5: Partner Preferences
  prefAgeMin: number;
  prefAgeMax: number;
  prefHeightMinCm?: number | null;
  prefHeightMaxCm?: number | null;
  prefMaritalStatuses?: string[];
  prefReligions: string[];
  prefCastes?: string[];
  prefMotherTongues?: string[];
  prefMinEducation?: string | null;
  prefAcceptableIncomes?: string[];
  prefLocations?: string[];

  // Step 6: Photos & Verification
  photoS3Keys: string[];
  photoPrivacy?: PhotoPrivacy;
  verificationMethod: 'selfie' | 'govt_id';
  selfieS3Key?: string | null;
  govtIdType?: ('Aadhaar' | 'PAN card' | 'Passport' | 'Driving licence' | 'Voter ID') | null;
  govtIdS3Key?: string | null;
  horoscopeS3Key?: string | null;
  horoscopeFileName?: string | null;
  horoscopeFileSizeBytes?: number | null;
}
