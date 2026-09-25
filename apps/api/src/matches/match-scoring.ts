/**
 * Basic matrimony matching — pure functions (no DB), unit-tested.
 *
 * Hard filters (For you must pass): age from DOB (inclusive whole years),
 * marital status any-of, religion any-of. Empty religion or marital fails
 * (those three prefs are required). Gender is filtered in the service query.
 *
 * Internal rank (For you sort only, never shown as a percent):
 *   caste/community 25, mother tongue 20, education >= minimum 20,
 *   location 20, height in range 15.
 *
 * Blank optional preference = no rank points and no exclusion.
 * "Caste no bar" means any community can match.
 */

import { isOpenCommunityPreference } from '@astalakshimi/reference';

export interface BasicPrefs {
  prefAgeMin?: number | null;
  prefAgeMax?: number | null;
  prefHeightMinCm?: number | null;
  prefHeightMaxCm?: number | null;
  prefMaritalStatuses?: string[] | null;
  prefReligions?: string[] | null;
  prefCastes?: string[] | null;
  prefMotherTongues?: string[] | null;
  prefMinEducation?: string | null;
  prefLocations?: string[] | null;
}

export interface MatchCandidate {
  dob?: string | Date | null;
  heightCm?: number | null;
  maritalStatus?: string | null;
  religion?: string | null;
  caste?: string | null;
  motherTongue?: string | null;
  educationLevel?: string | null;
  city?: string | null;
  state?: string | null;
}

const RANK_WEIGHTS = {
  caste: 25,
  motherTongue: 20,
  education: 20,
  location: 20,
  height: 15,
} as const;

const EDUCATION_RANK: Record<string, number> = {
  'high school': 1,
  diploma: 2,
  professional: 3,
  bachelors: 3,
  masters: 4,
  doctorate: 5,
};

export function educationRank(level?: string | null): number {
  if (!level) return 0;
  return EDUCATION_RANK[level.trim().toLowerCase()] ?? 0;
}

function norm(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function normList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
}

/** Whole-years age for a YYYY-MM-DD dob (or Date), or null when unparseable. */
export function candidateAge(
  dob?: string | Date | null,
  ref: Date = new Date(),
): number | null {
  if (dob == null) return null;

  let year: number;
  let month: number;
  let day: number;

  if (dob instanceof Date) {
    if (Number.isNaN(dob.getTime())) return null;
    // Use UTC calendar parts — Postgres `date` columns arrive as UTC midnight.
    year = dob.getUTCFullYear();
    month = dob.getUTCMonth();
    day = dob.getUTCDate();
  } else if (typeof dob === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob.trim());
    if (!m) return null;
    year = Number(m[1]);
    month = Number(m[2]) - 1;
    day = Number(m[3]);
  } else {
    return null;
  }

  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  let age = ref.getFullYear() - year;
  const dm = ref.getMonth() - month;
  if (dm < 0 || (dm === 0 && ref.getDate() < day)) age -= 1;
  return age;
}

/** Male↔Female. Other viewers see both. Unknown gender yields an empty list. */
export function targetGenders(viewerGender?: string | null): string[] {
  if (viewerGender === 'Male') return ['Female'];
  if (viewerGender === 'Female') return ['Male'];
  if (viewerGender === 'Other') return ['Male', 'Female'];
  return [];
}

export function hasRequiredPartnerPrefs(prefs: BasicPrefs): boolean {
  return (
    prefs.prefAgeMin != null &&
    prefs.prefAgeMax != null &&
    normList(prefs.prefReligions).length > 0 &&
    normList(prefs.prefMaritalStatuses).length > 0
  );
}

export type HardFilterKey = 'age' | 'maritalStatus' | 'religion';

/** Hard filters only. Empty required prefs fail. Returns ok=false with the first failing dimension. */
export function passesHardFilters(
  candidate: MatchCandidate,
  prefs: BasicPrefs,
  ref: Date = new Date(),
): { ok: boolean; failedOn?: HardFilterKey } {
  if (prefs.prefAgeMin == null || prefs.prefAgeMax == null) {
    return { ok: false, failedOn: 'age' };
  }

  const age = candidateAge(candidate.dob, ref);
  if (age === null || age < prefs.prefAgeMin || age > prefs.prefAgeMax) {
    return { ok: false, failedOn: 'age' };
  }

  const marital = normList(prefs.prefMaritalStatuses);
  if (marital.length === 0 || !marital.includes(norm(candidate.maritalStatus))) {
    return { ok: false, failedOn: 'maritalStatus' };
  }

  const religions = normList(prefs.prefReligions);
  if (religions.length === 0 || !religions.includes(norm(candidate.religion))) {
    return { ok: false, failedOn: 'religion' };
  }

  return { ok: true };
}

export interface MatchScore {
  points: number;
  reasons: string[];
}

/**
 * A preferred location hits when it is the candidate's city, their state, or a
 * catalog label that starts with the city ("Bengaluru, Karnataka"). City names
 * from the identity picker are the values onboarding stores.
 */
function locationMatches(candidate: MatchCandidate, locations: string[]): boolean {
  const city = norm(candidate.city);
  const state = norm(candidate.state);
  return locations.some((loc) => {
    if (city && (loc === city || loc.startsWith(`${city},`))) return true;
    if (state && loc === state) return true;
    return false;
  });
}

/** Internal rank for a candidate that already passed hard filters. Not a public percent. */
export function scoreCandidate(
  candidate: MatchCandidate,
  prefs: BasicPrefs,
  _ref: Date = new Date(),
): MatchScore {
  let earned = 0;
  const reasons: string[] = [];

  const castes = isOpenCommunityPreference(prefs.prefCastes) ? [] : normList(prefs.prefCastes);
  if (castes.length > 0 && castes.includes(norm(candidate.caste))) {
    earned += RANK_WEIGHTS.caste;
    reasons.push('Same community');
  }

  const tongues = normList(prefs.prefMotherTongues);
  if (tongues.length > 0 && tongues.includes(norm(candidate.motherTongue))) {
    earned += RANK_WEIGHTS.motherTongue;
    reasons.push('Same mother tongue');
  }

  const minEdu = educationRank(prefs.prefMinEducation);
  if (minEdu > 0 && educationRank(candidate.educationLevel) >= minEdu) {
    earned += RANK_WEIGHTS.education;
    reasons.push('Education match');
  }

  const locations = normList(prefs.prefLocations);
  if (locations.length > 0 && locationMatches(candidate, locations)) {
    earned += RANK_WEIGHTS.location;
    reasons.push('Preferred location');
  }

  const hMin = prefs.prefHeightMinCm ?? null;
  const hMax = prefs.prefHeightMaxCm ?? null;
  if (
    (hMin != null || hMax != null) &&
    candidate.heightCm != null &&
    (hMin == null || candidate.heightCm >= hMin) &&
    (hMax == null || candidate.heightCm <= hMax)
  ) {
    earned += RANK_WEIGHTS.height;
    reasons.push('Height match');
  }

  return { points: earned, reasons: reasons.slice(0, 3) };
}
