/**
 * Match scoring contracts shared between the API and web.
 *
 * `matchPercent` is computed by `apps/api/src/matches/match-scoring.ts`
 * (base 40 + up to 60 soft points, capped 98). Absent/null means
 * "no score computed" (e.g. viewing your own profile) — the UI must
 * hide the badge rather than fabricate a number.
 */

export interface MatchScoreInfo {
  matchPercent?: number | null;
  matchReasons?: string[];
}

/** Item of GET /matches/top and GET /matches (Home feed + Discover matches). */
export interface TopMatch extends MatchScoreInfo {
  id: string;
  fullName: string;
  gender?: string | null;
  age: number;
  heightCm?: number | null;
  city?: string | null;
  state?: string | null;
  religion?: string | null;
  caste?: string | null;
  motherTongue?: string | null;
  maritalStatus?: string | null;
  educationLevel?: string | null;
  degree?: string | null;
  profession?: string | null;
  occupation?: string | null;
  companyName?: string | null;
  annualIncome?: string | null;
  photos: string[];
  photoVerified?: boolean;
  isPremium?: boolean;
  isVerified?: boolean;
  blurPhoto?: boolean;
  // Display-ready fields shared with the search response so MatchListCard
  // renders the same in both Discover panels.
  planSlug?: string | null;
  planName?: string | null;
  education?: string | null;
  company?: string | null;
  income?: string | null;
  about?: string | null;
  lastActive?: string | null;
  community?: string | null;
  height?: string | null;
}

/** Response of GET /matches (score-ranked, paginated). */
export interface PaginatedMatches {
  matches: TopMatch[];
  totalCount: number;
}
