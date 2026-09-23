/**
 * Basic matrimony matching — pure functions (no DB), unit-tested.
 *
 * Canonical matching set (kept deliberately small):
 *   Hard filters (must pass): age range, marital status (if set), religion (if set).
 *     Gender is filtered in the service query, not here.
 *   Soft score, 60 pts on top of a 40 base:
 *     caste/community 15, mother tongue 12, education >= minimum 12,
 *     location 10, height in range 6, age near middle of range 5.
 *
 * Empty/unset preference = "no preference" (no filter, no points).
 * `pref_acceptable_incomes` and any future columns are intentionally
 * ignored by v1 scoring.
 */

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

/** Fallback age window when the viewer never set preferences. */
export const DEFAULT_PREF_AGE_MIN = 21;
export const DEFAULT_PREF_AGE_MAX = 35;

const BASE_SCORE = 40;
const MAX_SCORE = 98;

const WEIGHTS = {
  caste: 15,
  motherTongue: 12,
  education: 12,
  location: 10,
  height: 6,
  ageFit: 5,
} as const;

const EDUCATION_RANK: Record<string, number> = {
  'high school': 1,
  diploma: 2,
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

export type HardFilterKey = 'age' | 'maritalStatus' | 'religion';

/** Hard filters only. Returns ok=false with the first failing dimension. */
export function passesHardFilters(
  candidate: MatchCandidate,
  prefs: BasicPrefs,
  ref: Date = new Date(),
): { ok: boolean; failedOn?: HardFilterKey } {
  const ageMin = prefs.prefAgeMin ?? DEFAULT_PREF_AGE_MIN;
  const ageMax = prefs.prefAgeMax ?? DEFAULT_PREF_AGE_MAX;

  const age = candidateAge(candidate.dob, ref);
  if (age === null || age < ageMin || age > ageMax) {
    return { ok: false, failedOn: 'age' };
  }

  const marital = normList(prefs.prefMaritalStatuses);
  if (marital.length > 0 && !marital.includes(norm(candidate.maritalStatus))) {
    return { ok: false, failedOn: 'maritalStatus' };
  }

  const religions = normList(prefs.prefReligions);
  if (religions.length > 0 && !religions.includes(norm(candidate.religion))) {
    return { ok: false, failedOn: 'religion' };
  }

  return { ok: true };
}

export interface MatchScore {
  percent: number;
  reasons: string[];
}

/** Soft score for a candidate that already passed hard filters. */
export function scoreCandidate(candidate: MatchCandidate, prefs: BasicPrefs, ref: Date = new Date()): MatchScore {
  let earned = 0;
  const reasons: string[] = [];

  const castes = normList(prefs.prefCastes);
  if (castes.length > 0 && castes.includes(norm(candidate.caste))) {
    earned += WEIGHTS.caste;
    reasons.push('Same community');
  }

  const tongues = normList(prefs.prefMotherTongues);
  if (tongues.length > 0 && tongues.includes(norm(candidate.motherTongue))) {
    earned += WEIGHTS.motherTongue;
    reasons.push('Same mother tongue');
  }

  const minEdu = educationRank(prefs.prefMinEducation);
  if (minEdu > 0 && educationRank(candidate.educationLevel) >= minEdu) {
    earned += WEIGHTS.education;
    reasons.push('Education match');
  }

  const locations = normList(prefs.prefLocations);
  if (locations.length > 0) {
    const city = norm(candidate.city);
    const state = norm(candidate.state);
    if ((city && locations.includes(city)) || (state && locations.includes(state))) {
      earned += WEIGHTS.location;
      reasons.push('Preferred location');
    }
  }

  const hMin = prefs.prefHeightMinCm ?? null;
  const hMax = prefs.prefHeightMaxCm ?? null;
  if (
    (hMin != null || hMax != null) &&
    candidate.heightCm != null &&
    (hMin == null || candidate.heightCm >= hMin) &&
    (hMax == null || candidate.heightCm <= hMax)
  ) {
    earned += WEIGHTS.height;
    reasons.push('Height match');
  }

  const ageMin = prefs.prefAgeMin ?? DEFAULT_PREF_AGE_MIN;
  const ageMax = prefs.prefAgeMax ?? DEFAULT_PREF_AGE_MAX;
  const age = candidateAge(candidate.dob, ref);
  if (age !== null) {
    const mid = (ageMin + ageMax) / 2;
    const half = (ageMax - ageMin) / 2;
    if (half > 0 && Math.abs(age - mid) <= half / 2) {
      earned += WEIGHTS.ageFit;
      reasons.push('Age match');
    }
  }

  return { percent: Math.min(MAX_SCORE, BASE_SCORE + earned), reasons: reasons.slice(0, 4) };
}
