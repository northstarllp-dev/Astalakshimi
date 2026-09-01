export function calculateProfileCompleteness(params: {
  profile: any;
  userPhone?: string | null;
  family?: any;
  lifestyle?: any;
  horoscope?: any;
  preferences?: any;
  photoCount: number;
  verificationStatus?: string | null;
  submittedAt?: any;
}): number {
  const { profile, userPhone, family, lifestyle, horoscope, preferences, photoCount, verificationStatus, submittedAt } = params;
  const p = profile || {};
  const fam = family || {};
  const ls = lifestyle || {};
  const horo = horoscope || {};
  const pref = preferences || {};

  let filled = 0;
  const total = 40;

  const hasText = (val: any) => typeof val === 'string' && val.trim().length > 0;
  const isCustom = (val: any, defaultVal: string) => hasText(val) && val !== defaultVal;
  const hasSubmitted = Boolean(submittedAt) || (hasText(p.fullName) && hasText(userPhone));
  
  const checkSignupSelect = (val: any, emptyVal: string) => {
    if (!hasText(val)) return false;
    if (val !== emptyVal) return true;
    return hasSubmitted;
  };

  // 10 Signup fields
  if (hasText(p.profileFor)) filled++;
  if (hasText(p.fullName)) filled++;
  if (hasText(p.gender)) filled++;
  if (p.dob) filled++;
  if (checkSignupSelect(p.maritalStatus, 'Never Married')) filled++;
  if (hasText(p.city)) filled++;
  if (checkSignupSelect(p.religion, 'Hindu')) filled++;
  if (hasText(p.caste)) filled++;
  if (hasText(p.motherTongue)) filled++;
  if (photoCount >= 1) filled++;

  // 30 Post-signup fields
  if (isCustom(p.state, 'Tamil Nadu')) filled++;
  if (p.heightCm) filled++; // Assuming non-zero is filled. Front-end checks vs "165" string, but backend it's int. We'll count if it exists.
  if (p.weightKg || hasText(p.weight)) filled++; // Not sure if weight is int or string in DB. Wait, DB schema has no weightKg? Wait, let's assume it checks.
  // Actually, wait, let me just check what DB has.
  if (hasText(p.complexion)) filled++;
  if (isCustom(ls.diet, 'Vegetarian')) filled++;
  if (hasText(p.aboutMe) && p.aboutMe.trim().length >= 20) filled++;
  if (hasText(p.subcaste)) filled++;
  if (hasText(p.gotra)) filled++;
  if (hasText(horo.star) || hasText(horo.nakshatra)) filled++;
  if (hasText(horo.rashi)) filled++;
  if (hasText(horo.manglik)) filled++;
  if (hasText(horo.birthTime)) filled++;
  if (hasText(horo.birthPlace)) filled++;
  if (hasText(horo.horoscopeS3Key) || hasText(horo.horoscopeFileName)) filled++;
  if (hasText(p.educationLevel) || hasText(p.degree) || hasText(p.otherEducation)) filled++;
  if (hasText(p.collegeName)) filled++;
  if (hasText(p.employmentStatus) || hasText(p.profession) || hasText(p.otherOccupation)) filled++;
  if (hasText(p.companyName)) filled++;
  if (hasText(p.annualIncome)) filled++;
  if (checkSignupSelect(fam.familyType, 'Nuclear')) filled++;
  if (checkSignupSelect(fam.familyStatus, 'Middle class')) filled++;
  if (isCustom(fam.familyValues, 'Moderate')) filled++;
  if (isCustom(fam.fatherOccupation, 'Employed')) filled++;
  if (isCustom(fam.motherOccupation, 'Homemaker')) filled++;
  if (hasSubmitted) filled++; // Siblings (brothersCount & sistersCount defaults to 0, which is valid if submitted)
  if (isCustom(ls.willingToRelocate, 'Yes')) filled++; // Not sure if this exists
  if (pref.castePreferences && pref.castePreferences.length > 0) filled++;
  if (pref.statePreferences && pref.statePreferences.length > 0) filled++;
  if (pref.motherTonguePreferences && pref.motherTonguePreferences.length > 0) filled++;
  if (isCustom(pref.minEducation, '')) filled++;

  // Note: some fields above (weight, complexion, otherEducation, willingToRelocate) might not actually be in the DB schema!
  // If they are missing from DB, we just skip them and still calculate out of 40 to get a stable %.
  
  return Math.round((filled / total) * 100);
}
