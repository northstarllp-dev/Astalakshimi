export type ProfileCompletenessInput = {
  fullName?: string | null;
  phone?: string | null;
  city?: string | null;
  religion?: string | null;
  caste?: string | null;
  motherTongue?: string | null;
  aboutMe?: string | null;
  photoCount?: number;
  birthTime?: string | null;
  birthPlace?: string | null;
  verificationStatus?: string | null;
};

export function calculateProfileCompleteness(p: ProfileCompletenessInput): number {
  let score = 0;
  if (p.fullName && p.fullName.length >= 3) score += 15;
  const digits = (p.phone || '').replace(/\D/g, '');
  const phone10 = digits.length >= 10 ? digits.slice(-10) : digits;
  if (phone10.length === 10) score += 10;
  if (p.city) score += 10;
  if (p.religion && p.caste && p.motherTongue) score += 15;
  if ((p.photoCount ?? 0) >= 1) score += 20;
  if (p.aboutMe && p.aboutMe.length >= 20) score += 10;
  if (p.birthTime && p.birthPlace) score += 10;
  if (p.verificationStatus === 'verified') score += 10;
  return Math.min(100, score);
}
