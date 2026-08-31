import { emptySignupData, type SignupData } from "@/lib/profile-store"

/**
 * Profile completeness = filled details / total details.
 *
 * Specs (`ui-public-auth.md`, `ui-dashboard.md`, `ui-changes.md`):
 * - Short signup should land near 25% (10 of 40 details).
 * - Discover unlocks when every *required* field is filled (signup + education, occupation, income).
 *   Optional details (employer, specialization, family, horoscope, …) do not block Discover.
 * - Frontend never talks to Postgres; this is computed from SignupData (session cache / API profile).
 *
 * Defaults from `emptySignupData()` (height 165, diet Vegetarian, etc.) do not count
 * until the member actually sets them, except signup fields after submit.
 */

const EMPTY = emptySignupData()

export const PROFILE_DETAIL_TOTAL = 40

export type ProfileDetailGroup =
  | "basics"
  | "community"
  | "career"
  | "family"
  | "lifestyle"
  | "horoscope"
  | "photos"
  | "preferences"

export type ProfileDetailField = {
  id: string
  label: string
  group: ProfileDetailGroup
  /** True if this field is collected on the short 5-step register. */
  signup: boolean
  /** Must be filled before Discover / extra matches unlock. */
  required?: boolean
  filled: (d: SignupData) => boolean
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0
}

function hasSubmitted(d: SignupData): boolean {
  return Boolean(d.submittedAt) || (hasText(d.fullName) && hasText(d.phone))
}

function filledTyped(value: string | undefined | null): boolean {
  return hasText(value)
}

/** Count only if the member changed it from the empty-form default. */
function filledCustom(value: string | undefined | null, emptyDefault: string): boolean {
  return hasText(value) && value !== emptyDefault
}

/** Signup selects: count after submit even if they kept the form default. */
function filledSignupSelect(value: string | undefined | null, emptyDefault: string, d: SignupData): boolean {
  if (!hasText(value)) return false
  if (value !== emptyDefault) return true
  return hasSubmitted(d)
}

export const PROFILE_DETAIL_FIELDS: ProfileDetailField[] = [
  // Signup (~25%): 10 fields
  { id: "profileFor", label: "Profile for", group: "basics", signup: true, required: true, filled: (d) => filledTyped(d.profileFor) },
  { id: "fullName", label: "Full name", group: "basics", signup: true, required: true, filled: (d) => filledTyped(d.fullName) },
  { id: "gender", label: "Gender", group: "basics", signup: true, required: true, filled: (d) => filledTyped(d.gender) },
  {
    id: "dob",
    label: "Date of birth",
    group: "basics",
    signup: true,
    required: true,
    filled: (d) => Boolean(d.dobDay && d.dobMonth && d.dobYear),
  },
  {
    id: "maritalStatus",
    label: "Marital status",
    group: "basics",
    signup: true,
    required: true,
    filled: (d) => filledSignupSelect(d.maritalStatus, EMPTY.maritalStatus, d),
  },
  { id: "city", label: "City", group: "basics", signup: true, required: true, filled: (d) => filledTyped(d.city) },
  {
    id: "religion",
    label: "Religion",
    group: "community",
    signup: true,
    required: true,
    filled: (d) => filledSignupSelect(d.religion, EMPTY.religion, d),
  },
  { id: "caste", label: "Caste / community", group: "community", signup: true, required: true, filled: (d) => filledTyped(d.caste) },
  {
    id: "motherTongue",
    label: "Mother tongue",
    group: "community",
    signup: true,
    required: true,
    filled: (d) => filledTyped(d.motherTongue),
  },
  {
    id: "photos",
    label: "Profile photo",
    group: "photos",
    signup: true,
    required: true,
    filled: (d) => (d.photos?.length ?? 0) >= 1 || (d.photoS3Keys?.length ?? 0) >= 1,
  },

  // Post-signup (remaining 30)
  { id: "state", label: "State", group: "basics", signup: false, filled: (d) => filledCustom(d.state, EMPTY.state) },
  { id: "height", label: "Height", group: "lifestyle", signup: false, filled: (d) => filledCustom(d.height, EMPTY.height) },
  { id: "weight", label: "Weight", group: "lifestyle", signup: false, filled: (d) => filledTyped(d.weight) },
  { id: "complexion", label: "Complexion", group: "lifestyle", signup: false, filled: (d) => filledTyped(d.complexion) },
  { id: "diet", label: "Diet", group: "lifestyle", signup: false, filled: (d) => filledCustom(d.diet, EMPTY.diet) },
  {
    id: "aboutMe",
    label: "About me",
    group: "lifestyle",
    signup: false,
    filled: (d) => Boolean(d.aboutMe && d.aboutMe.trim().length >= 20),
  },
  { id: "subcaste", label: "Subcaste", group: "community", signup: false, filled: (d) => filledTyped(d.subcaste) },
  { id: "gotra", label: "Gotra", group: "community", signup: false, filled: (d) => filledTyped(d.gotra) },
  { id: "star", label: "Star / nakshatra", group: "horoscope", signup: false, filled: (d) => filledTyped(d.star) },
  { id: "rashi", label: "Rashi", group: "horoscope", signup: false, filled: (d) => filledTyped(d.rashi) },
  {
    id: "manglik",
    label: "Manglik",
    group: "horoscope",
    signup: false,
    filled: (d) => filledCustom(d.manglik, EMPTY.manglik),
  },
  { id: "birthTime", label: "Birth time", group: "horoscope", signup: false, filled: (d) => filledTyped(d.birthTime) },
  { id: "birthPlace", label: "Birth place", group: "horoscope", signup: false, filled: (d) => filledTyped(d.birthPlace) },
  {
    id: "horoscopeFile",
    label: "Horoscope PDF",
    group: "horoscope",
    signup: false,
    filled: (d) => Boolean(d.horoscopeName || d.horoscopeS3Key),
  },
  {
    id: "education",
    label: "Highest education",
    group: "career",
    signup: false,
    required: true,
    filled: (d) => filledTyped(d.education) || filledTyped(d.degree) || filledTyped(d.otherEducation),
  },
  { id: "collegeName", label: "College", group: "career", signup: false, filled: (d) => filledTyped(d.collegeName) },
  {
    id: "occupation",
    label: "Occupation",
    group: "career",
    signup: false,
    required: true,
    filled: (d) => filledTyped(d.occupation) || filledTyped(d.profession) || filledTyped(d.otherOccupation),
  },
  { id: "companyName", label: "Company", group: "career", signup: false, filled: (d) => filledTyped(d.companyName) },
  {
    id: "annualIncome",
    label: "Annual income",
    group: "career",
    signup: false,
    required: true,
    filled: (d) => filledCustom(d.annualIncome, EMPTY.annualIncome),
  },
  {
    id: "familyType",
    label: "Family type",
    group: "family",
    signup: false,
    filled: (d) => filledSignupSelect(d.familyType, EMPTY.familyType, d),
  },
  {
    id: "familyStatus",
    label: "Family status",
    group: "family",
    signup: false,
    filled: (d) => filledSignupSelect(d.familyStatus, EMPTY.familyStatus, d),
  },
  {
    id: "familyValues",
    label: "Family values",
    group: "family",
    signup: false,
    filled: (d) => filledCustom(d.familyValues ?? "", EMPTY.familyValues ?? ""),
  },
  {
    id: "fatherOccupation",
    label: "Father's occupation",
    group: "family",
    signup: false,
    filled: (d) => filledCustom(d.fatherOccupation, EMPTY.fatherOccupation),
  },
  {
    id: "motherOccupation",
    label: "Mother's occupation",
    group: "family",
    signup: false,
    filled: (d) => filledCustom(d.motherOccupation, EMPTY.motherOccupation),
  },
  {
    id: "siblings",
    label: "Brothers & sisters",
    group: "family",
    signup: false,
    filled: (d) => hasSubmitted(d),
  },
  {
    id: "willingToRelocate",
    label: "Willing to relocate",
    group: "lifestyle",
    signup: false,
    filled: (d) => filledCustom(d.willingToRelocate, EMPTY.willingToRelocate),
  },
  {
    id: "prefCastes",
    label: "Preferred communities",
    group: "preferences",
    signup: false,
    filled: (d) => (d.prefCastes?.length ?? 0) > 0,
  },
  {
    id: "prefLocations",
    label: "Preferred locations",
    group: "preferences",
    signup: false,
    filled: (d) => (d.prefLocations?.length ?? 0) > 0,
  },
  {
    id: "prefMotherTongues",
    label: "Preferred mother tongues",
    group: "preferences",
    signup: false,
    filled: (d) => (d.prefMotherTongues?.length ?? 0) > 0,
  },
  {
    id: "prefMinEducation",
    label: "Preferred education",
    group: "preferences",
    signup: false,
    filled: (d) => filledCustom(d.prefMinEducation ?? "", EMPTY.prefMinEducation ?? ""),
  },
]

if (PROFILE_DETAIL_FIELDS.length !== PROFILE_DETAIL_TOTAL) {
  throw new Error(
    `PROFILE_DETAIL_FIELDS length ${PROFILE_DETAIL_FIELDS.length} must equal PROFILE_DETAIL_TOTAL ${PROFILE_DETAIL_TOTAL}`
  )
}

export type ProfileCompletenessStats = {
  filled: number
  total: number
  percentage: number
  requiredFilled: number
  requiredTotal: number
  requiredComplete: boolean
  missingRequired: Array<ProfileDetailField & { done: boolean }>
  fields: Array<ProfileDetailField & { done: boolean }>
}

export function getProfileCompletenessStats(data: SignupData | null): ProfileCompletenessStats {
  const fields = PROFILE_DETAIL_FIELDS.map((field) => ({
    ...field,
    done: data ? field.filled(data) : false,
  }))
  const filled = fields.filter((f) => f.done).length
  const requiredFields = fields.filter((f) => f.required)
  const requiredFilled = requiredFields.filter((f) => f.done).length
  const requiredTotal = requiredFields.length
  return {
    filled,
    total: PROFILE_DETAIL_TOTAL,
    percentage: Math.round((filled / PROFILE_DETAIL_TOTAL) * 100),
    requiredFilled,
    requiredTotal,
    requiredComplete: requiredTotal > 0 && requiredFilled === requiredTotal,
    missingRequired: requiredFields.filter((f) => !f.done),
    fields,
  }
}

export function getProfileCompleteness(data: SignupData | null): number {
  return getProfileCompletenessStats(data).percentage
}
