/**
 * Canonical Layer-B required fields for Discover unlock / verification gate /
 * staff auto-verify. Keep in sync with apps/web profile-completeness
 * (`required: true`) and search/matches eligibility (`profiles.required_complete`).
 */
export function requiredFieldsComplete(params: {
  profile?: Record<string, unknown> | null;
  lifestyle?: Record<string, unknown> | null;
  horoscope?: Record<string, unknown> | null;
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
