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

/** Item of GET /matches/top (the Home "top matches" feed). */
export interface TopMatch extends MatchScoreInfo {
  id: string;
  fullName: string;
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
}
