export interface PartnerPreference {
  id: string;
  profileId: string;
  prefAgeMin: number;
  prefAgeMax: number;
  prefHeightMinCm: number;
  prefHeightMaxCm: number;
  prefMaritalStatuses: string[];
  prefReligions: string[];
  prefCastes: string[];
  prefMotherTongues: string[];
  prefMinEducation?: string | null;
  prefAcceptableIncomes: string[];
  prefLocations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchFilterParams {
  lookingForGender?: 'Male' | 'Female' | 'Other';
  ageMin?: number;
  ageMax?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  religions?: string[];
  castes?: string[];
  motherTongues?: string[];
  educations?: string[];
  occupations?: string[];
  incomeBands?: string[];
  cities?: string[];
  states?: string[];
  maritalStatuses?: string[];
  manglik?: string;
  page?: number;
  limit?: number;
}
