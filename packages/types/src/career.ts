export interface OccupationOption {
  id: number;
  name: string;
  category?: string | null;
}

export interface CompanySearchResult {
  id: number;
  name: string;
  sector?: string | null;
  label: string;
}

export interface ResolvedOccupation {
  id: number;
  name: string;
}

export interface ResolvedCompany {
  id: number;
  name: string;
  sector?: string | null;
}
