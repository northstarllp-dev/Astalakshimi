import type { PartnerPreference } from './preference.js';
import type { MatchScoreInfo } from './match.js';

export type Gender = 'Male' | 'Female' | 'Other';
export type ProfileFor = 'Myself' | 'Son' | 'Daughter' | 'Brother' | 'Sister' | 'Relative';
/** System-owned: set by member signup (`self`) or admin create (`staff`). Never member-writable. */
export type CreatedBy = 'self' | 'staff';
export type MaritalStatus = 'Never Married' | 'Divorced' | 'Widowed' | 'Awaiting Divorce';
export type EducationLevel = 'Bachelors' | 'Masters' | 'Doctorate' | 'Diploma' | 'High School';
export type EmploymentStatus = 'Employed' | 'Business Owner' | 'Freelancer' | 'Not Working';
export type CompanySector = 'Private' | 'Govt' | 'MNC' | 'Startup' | 'Business';
export type PhotoPrivacy = 'blurred' | 'accepted' | 'visible';
export type Complexion = 'Very fair' | 'Fair' | 'Wheatish' | 'Wheatish brown' | 'Dark';

export type FamilyValues = 'Traditional' | 'Moderate' | 'Liberal';
export type FamilyType = 'Nuclear' | 'Joint' | 'Extended';
export type ParentOccupation = 'Employed' | 'Business' | 'Retired' | 'Homemaker' | 'Passed Away';

export type Diet = 'Vegetarian' | 'Non-vegetarian' | 'Eggetarian' | 'Jain' | 'Vegan';
export type HabitFrequency = 'Never' | 'Occasionally' | 'Regularly' | 'Planning to quit';

export type ManglikStatus = 'Yes' | 'No' | "Don't Know" | 'Both';

export interface Profile {
  id: string;
  userId: string;
  /** Present on DB rows; member UI must not edit. Admin surfaces this. */
  createdBy?: CreatedBy;
  profileFor: ProfileFor | string;
  fullName: string;
  gender: Gender;
  dob: string; // YYYY-MM-DD
  maritalStatus: MaritalStatus;
  hasChildren?: boolean;
  childrenCount?: number;
  childrenLivingWithMe?: boolean | null;
  heightCm: number;
  aboutMe?: string | null;
  weightKg?: number | null;
  complexion?: Complexion | string | null;
  disability?: string | null;
  city: string;
  state: string;
  country: string;
  citySlug?: string | null;
  willingToRelocate?: string | null;
  religion: string;
  caste: string;
  communitySlug?: string | null;
  subcaste?: string | null;
  gotra?: string | null;
  motherTongue: string;
  educationLevel?: EducationLevel | null;
  degree?: string | null;
  collegeName?: string | null;
  employmentStatus?: EmploymentStatus | null;
  profession?: string | null;
  companyName?: string | null;
  companySector?: CompanySector | null;
  annualIncome?: string | null;
  photoPrivacy: PhotoPrivacy;
  /** Layer-B discoverability flag — true when every required Discover field is filled. */
  requiredComplete?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyDetails {
  id: string;
  profileId: string;
  familyValues?: FamilyValues | null;
  familyType?: FamilyType | null;
  familyStatus?: string | null;
  fatherOccupation?: ParentOccupation | null;
  motherOccupation?: ParentOccupation | null;
  brothersCount: number;
  sistersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LifestyleInterests {
  id: string;
  profileId: string;
  diet: Diet | null;
  smoking: HabitFrequency | null;
  alcohol: HabitFrequency | null;
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
export interface FullProfileView extends MatchScoreInfo {
  profile: Profile;
  family?: FamilyDetails | null;
  lifestyle?: LifestyleInterests | null;
  horoscope?: Horoscope | null;
  /** Present on GET /profiles/me so edit forms can round-trip partner prefs. */
  preferences?: PartnerPreference | null;
  verification?: any | null;
  photos: {
    id: string;
    s3Key: string;
    url?: string;
    isPrimary: boolean;
    displayOrder: number;
    status?: 'pending' | 'approved' | 'rejected';
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
  profileFor: ProfileFor | string;
  fullName: string;
  gender: Gender;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  maritalStatus: MaritalStatus;
  hasChildren?: boolean;
  childrenCount?: number;
  childrenLivingWithMe?: boolean | null;
  heightCm: number;
  aboutMe?: string;
  weightKg?: number | null;
  complexion?: Complexion | string | null;
  disability?: string | null;

  // Step 3: Location & Community
  city: string;
  state: string;
  country?: string;
  citySlug?: string | null;
  willingToRelocate?: string | null;
  religion: string;
  caste: string;
  communitySlug?: string | null;
  subcaste?: string | null;
  gotra?: string | null;
  motherTongue: string;

  // Step 4: Education & Career
  educationLevel?: EducationLevel | null;
  degree?: string | null;
  collegeName?: string | null;
  employmentStatus?: EmploymentStatus | null;
  profession?: string | null;
  companyName?: string | null;
  companySector?: CompanySector | null;
  annualIncome?: string | null;

  // Step 4: Family Details (post-community; optional until collected)
  familyValues?: FamilyValues | null;
  familyType?: FamilyType | null;
  familyStatus?: string | null;
  fatherOccupation?: ParentOccupation | null;
  motherOccupation?: ParentOccupation | null;
  brothersCount?: number;
  sistersCount?: number;

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
  /** Optional sha256 hashes aligned with photoS3Keys for dedupe persistence. */
  photoContentHashes?: string[];
  photoPrivacy?: PhotoPrivacy;
  verificationMethod: 'selfie' | 'govt_id';
  selfieS3Key?: string | null;
  govtIdType?: ('Aadhaar' | 'PAN card' | 'Passport' | 'Driving licence' | 'Voter ID') | null;
  govtIdS3Key?: string | null;
  horoscopeS3Key?: string | null;
  horoscopeFileName?: string | null;
  horoscopeFileSizeBytes?: number | null;
}
