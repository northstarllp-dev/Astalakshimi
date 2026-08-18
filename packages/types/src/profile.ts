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
  aboutMe?: string | null;
  city: string;
  state: string;
  country: string;
  religion: string;
  caste: string;
  subcaste?: string | null;
  gotra?: string | null;
  motherTongue: string;
  educationLevel: EducationLevel;
  degree: string;
  collegeName?: string | null;
  employmentStatus: EmploymentStatus;
  profession: string;
  companyName?: string | null;
  companySector?: CompanySector | null;
  annualIncome: string;
  photoPrivacy: PhotoPrivacy;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyDetails {
  id: string;
  profileId: string;
  familyValues: FamilyValues;
  familyType: FamilyType;
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
  photos: {
    id: string;
    s3Key: string;
    url?: string;
    isPrimary: boolean;
    displayOrder: number;
  }[];
  verificationStatus: 'idle' | 'pending' | 'verified' | 'rejected';
}

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
  aboutMe?: string;

  // Step 3: Location & Community
  city: string;
  state: string;
  country?: string;
  religion: string;
  caste: string;
  subcaste?: string;
  gotra?: string;
  motherTongue: string;

  // Step 4: Education & Career
  educationLevel: EducationLevel;
  degree: string;
  collegeName?: string;
  employmentStatus: EmploymentStatus;
  profession: string;
  companyName?: string;
  companySector?: CompanySector;
  annualIncome: string;

  // Step 4: Family Details
  familyValues: FamilyValues;
  familyType: FamilyType;
  fatherOccupation: ParentOccupation;
  motherOccupation: ParentOccupation;
  brothersCount: number;
  sistersCount: number;

  // Step 5: Lifestyle & Astrology
  diet: Diet;
  smoking?: HabitFrequency;
  alcohol?: HabitFrequency;
  interests?: string[];
  birthTime?: string;
  birthPlace?: string;
  manglik?: ManglikStatus;
  rashi?: string;
  nakshatra?: string;

  // Step 5: Partner Preferences
  prefAgeMin: number;
  prefAgeMax: number;
  prefHeightMinCm?: number;
  prefHeightMaxCm?: number;
  prefMaritalStatuses?: string[];
  prefReligions: string[];
  prefCastes?: string[];
  prefMotherTongues?: string[];
  prefMinEducation?: string;
  prefAcceptableIncomes?: string[];
  prefLocations?: string[];

  // Step 6: Photos & Verification
  photoS3Keys: string[];
  photoPrivacy?: PhotoPrivacy;
  verificationMethod: 'selfie' | 'govt_id';
  selfieS3Key?: string;
  govtIdType?: 'Aadhaar' | 'PAN card' | 'Passport' | 'Driving licence' | 'Voter ID';
  govtIdS3Key?: string;
  horoscopeS3Key?: string;
  horoscopeFileName?: string;
  horoscopeFileSizeBytes?: number;
}
