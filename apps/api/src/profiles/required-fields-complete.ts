/**
 * Server-side check that every *required* profile field is filled.
 * Mirrors apps/web/src/lib/profile-completeness.ts required fields so
 * submit-verification and Discover unlock agree.
 *
 * PROFILE_COMPLETE_THRESHOLD (80%) is admin display only — member gating
 * uses this required field set, not a percentage.
 */
export function requiredFieldsComplete(params: {
  profile?: any;
  lifestyle?: any;
  horoscope?: any;
  photoCount?: number;
} = {}): boolean {
  const p = params.profile || {};
  const ls = params.lifestyle || {};
  const horo = params.horoscope || {};
  const photoCount = params.photoCount ?? 0;

  const hasText = (val: unknown) => typeof val === 'string' && val.trim().length > 0;

  if (!hasText(p.profileFor)) return false;
  if (!hasText(p.fullName)) return false;
  if (!hasText(p.gender)) return false;
  if (!p.dob) return false;
  if (!hasText(p.maritalStatus)) return false;
  if (!hasText(p.city)) return false;
  if (!p.heightCm && !hasText(p.height)) return false;
  if (!hasText(p.religion)) return false;
  if (!hasText(p.caste)) return false;
  if (!hasText(p.motherTongue)) return false;
  if (photoCount < 1) return false;

  if (!hasText(ls.diet)) return false;

  if (!hasText(horo.star) && !hasText(horo.nakshatra)) return false;
  if (!hasText(horo.rashi)) return false;
  if (!hasText(horo.manglik)) return false;
  if (!hasText(horo.birthTime)) return false;
  if (!hasText(horo.birthPlace)) return false;

  if (!hasText(p.educationLevel) && !hasText(p.degree)) return false;
  if (!hasText(p.employmentStatus) && !hasText(p.profession)) return false;
  if (!hasText(p.annualIncome)) return false;

  return true;
}
