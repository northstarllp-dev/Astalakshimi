export type VerificationMethod = "selfie" | "govt_id" | ""
export type VerificationStatus = "idle" | "pending" | "verified" | "rejected"

import {
  getReligionLabels,
  getMotherTongueLabels,
  getRelocateLabels,
} from "@astalakshimi/reference"

export const DEMO_REJECTION_REASON = "Selfie does not match profile photos."

export type SignupData = {
  id?: string
  phone: string

  otp: string
  consentAccepted: boolean
  referredBy?: string
  profileFor: string
  fullName: string
  gender: string
  dobDay: string
  dobMonth: string
  dobYear: string
  height: string
  weight: string
  complexion: string
  diet: string
  smoking: string
  alcohol: string
  interests: string[]
  disability: string
  maritalStatus: string
  hasChildren?: boolean
  childrenCount?: number
  childrenLivingWithMe?: boolean | null
  religion: string
  caste: string
  communitySlug?: string
  subcaste: string
  gotra: string
  star: string
  rashi: string
  manglik: string
  motherTongue: string
  educationLevel: string
  degree: string
  collegeName: string
  employmentStatus: string
  profession: string
  companyName: string
  companySector?: string
  annualIncome: string
  familyValues?: string
  familyType: string
  familyStatus: string
  fatherOccupation: string
  motherOccupation: string
  brothersCount: number
  sistersCount: number
  siblings: string
  city: string
  state: string
  citySlug?: string
  willingToRelocate: string
  aboutMe: string
  prefAgeMin?: number
  prefAgeMax?: number
  prefHeightMinCm?: number
  prefHeightMaxCm?: number
  prefReligion?: string[]
  prefMaritalStatuses?: string[]
  prefCastes?: string[]
  prefMotherTongues?: string[]
  prefMinEducation?: string
  prefAcceptableIncomes?: string[]
  prefLocations?: string[]
  photos: string[]
  photoS3Keys: string[]
  /** sha256 hashes parallel to photoS3Keys (registration / upload dedupe). */
  photoContentHashes?: string[]
  photoObjects?: any[]
  photoPrivacy: string
  verificationMethod: VerificationMethod
  selfiePhoto: string
  selfieS3Key?: string
  govtIdType: string
  govtIdPhoto: string
  govtIdS3Key?: string
  horoscopeName: string
  horoscopeSize: number
  horoscopeS3Key?: string
  birthTime: string
  birthPlace: string
  verificationStatus: VerificationStatus
  rejectionReason?: string
  submittedAt: string
}

export const PROFILE_STORAGE_KEY = "astalakshimi.profile"
export const SIGNUP_DRAFT_KEY = "astalakshimi.signup_draft"
export const SIGNUP_TOTAL_STEPS = 5

export type SignupDraft = {
  step: number
  data: SignupData
  updatedAt: string
}

function isTransientMediaUrl(value: string | undefined | null): boolean {
  if (!value) return false
  return value.startsWith("data:") || value.startsWith("blob:")
}

/** Drop blob/data URLs (they break after reload); keep S3 keys for media restore. */
export function sanitizeSignupDraftData(data: SignupData): SignupData {
  const photoS3Keys = (data.photoS3Keys || []).filter(Boolean)
  const photosFromKeys = photoS3Keys.length
    ? photoS3Keys
    : (data.photos || []).filter((url) => url && !isTransientMediaUrl(url))

  return {
    ...data,
    otp: "",
    photos: photosFromKeys,
    photoS3Keys,
    selfiePhoto:
      !isTransientMediaUrl(data.selfiePhoto) && data.selfiePhoto
        ? data.selfiePhoto
        : data.selfieS3Key || "",
    govtIdPhoto:
      !isTransientMediaUrl(data.govtIdPhoto) && data.govtIdPhoto
        ? data.govtIdPhoto
        : data.govtIdS3Key || "",
  }
}

/** Furthest incomplete step based on filled fields (1–5). */
export function inferSignupResumeStep(data: SignupData): number {
  // Registration order: 1 phone, 2 OTP, 3 identity, 4 community, 5 photos.
  // OTP verification lives in the auth token (not the draft), so step 2 can't
  // be inferred from data — the register page bumps past it when a token exists.
  const step1Ok =
    Boolean(data.profileFor?.trim()) &&
    /^[6-9]\d{9}$/.test((data.phone || "").replace(/\D/g, ""))
  if (!step1Ok) return 1

  const identityOk =
    Boolean(data.fullName?.trim()) &&
    Boolean(data.gender) &&
    /^\d{2}$/.test(data.dobDay || "") &&
    /^\d{2}$/.test(data.dobMonth || "") &&
    /^\d{4}$/.test(data.dobYear || "") &&
    Boolean(data.maritalStatus) &&
    Boolean(data.city?.trim()) &&
    Boolean(data.height?.trim()) &&
    Boolean(data.diet) &&
    (data.maritalStatus === "Divorced" || data.maritalStatus === "Widowed"
      ? data.hasChildren === false || (data.hasChildren === true && data.childrenLivingWithMe !== undefined && data.childrenLivingWithMe !== null)
      : true)
  if (!identityOk) return 2

  const communityOk =
    Boolean(data.religion) &&
    Boolean(data.caste?.trim()) &&
    Boolean(data.motherTongue)
  if (!communityOk) return 4

  const hasPhoto = (data.photos?.length ?? 0) >= 1 || (data.photoS3Keys?.length ?? 0) >= 1
  const identityReady =
    (data.verificationMethod === "selfie" && Boolean(data.selfiePhoto || data.selfieS3Key)) ||
    (data.verificationMethod === "govt_id" &&
      Boolean(data.govtIdPhoto || data.govtIdS3Key) &&
      Boolean(data.govtIdType))
  if (!hasPhoto || !identityReady) return 5

  return 5
}

export function saveSignupDraft(data: SignupData, step: number) {
  if (typeof window === "undefined") return
  try {
    const draft: SignupDraft = {
      step: Math.min(Math.max(step, 1), SIGNUP_TOTAL_STEPS),
      data: sanitizeSignupDraftData(data),
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft))
  } catch (err) {
    console.warn("Could not save signup draft:", err)
  }
}

export function loadSignupDraft(): SignupDraft | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(SIGNUP_DRAFT_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<SignupDraft>
    const data = sanitizeSignupDraftData({
      ...emptySignupData(),
      ...(parsed.data || {}),
    })
    const inferred = inferSignupResumeStep(data)
    const savedStep =
      typeof parsed.step === "number" && Number.isFinite(parsed.step)
        ? Math.min(Math.max(Math.round(parsed.step), 1), SIGNUP_TOTAL_STEPS)
        : inferred
    // Prefer the furthest of saved position and inferred progress so users
    // resume where they left off even if step wasn't written yet.
    const step = Math.max(savedStep, inferred)
    return {
      step,
      data,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function clearSignupDraft() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(SIGNUP_DRAFT_KEY)
    sessionStorage.removeItem(PROFILE_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export const emptySignupData = (): SignupData => ({
  phone: "",
  otp: "",
  consentAccepted: true,
  referredBy: "",
  profileFor: "",
  fullName: "",
  gender: "",
  dobDay: "",
  dobMonth: "",
  dobYear: "",
  height: "",
  weight: "",
  complexion: "",
  diet: "",
  smoking: "",
  alcohol: "",
  interests: [],
  disability: "",
  maritalStatus: "",
  hasChildren: false,
  childrenCount: 0,
  childrenLivingWithMe: null,
  religion: "",
  caste: "",
  communitySlug: "",
  subcaste: "",
  gotra: "",
  star: "",
  rashi: "",
  manglik: "",
  motherTongue: "",
  educationLevel: "",
  degree: "",
  collegeName: "",
  employmentStatus: "",
  profession: "",
  companyName: "",
  companySector: undefined,
  annualIncome: "",
  familyValues: "",
  familyType: "",
  familyStatus: "",
  fatherOccupation: "",
  motherOccupation: "",
  brothersCount: 0,
  sistersCount: 0,
  siblings: "",
  city: "",
  state: "",
  citySlug: "",
  willingToRelocate: "",
  aboutMe: "",
  prefAgeMin: undefined,
  prefAgeMax: undefined,
  prefHeightMinCm: undefined,
  prefHeightMaxCm: undefined,
  prefReligion: [],
  prefMaritalStatuses: [],
  prefCastes: [],
  prefMotherTongues: [],
  prefMinEducation: "",
  prefAcceptableIncomes: [],
  prefLocations: [],
  photos: [],
  photoS3Keys: [],
  photoContentHashes: [],
  photoPrivacy: "blurred",
  verificationMethod: "",
  selfiePhoto: "",
  selfieS3Key: "",
  govtIdType: "",
  govtIdPhoto: "",
  govtIdS3Key: "",
  horoscopeName: "",
  horoscopeSize: 0,
  horoscopeS3Key: "",
  birthTime: "",
  birthPlace: "",
  verificationStatus: "idle",
  rejectionReason: undefined,
  submittedAt: "",
})

export function getPrefix(profileFor: string) {
  switch (profileFor) {
    case "Myself":
      return "Your"
    case "Son":
      return "Son's"
    case "Daughter":
      return "Daughter's"
    case "Brother":
      return "Brother's"
    case "Sister":
      return "Sister's"
    case "Relative":
      return "Relative's"
    case "Friend":
      return "Friend's"
    default:
      return ""
  }
}

export function saveProfile(data: SignupData) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.warn("Storage quota limit reached, saving sanitized lightweight profile:", err)
    try {
      const lightweight = {
        ...data,
        photos: data.photos.map((p) => p.startsWith("data:") ? "" : p),
        selfiePhoto: data.selfiePhoto?.startsWith("data:") ? "" : data.selfiePhoto,
        govtIdPhoto: data.govtIdPhoto?.startsWith("data:") ? "" : data.govtIdPhoto,
      }
      sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(lightweight))
    } catch {
      // Non-critical cache fallback
    }
  }
}

export function loadProfile(): SignupData | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(PROFILE_STORAGE_KEY)
  if (!raw) return null
  try {
    return { ...emptySignupData(), ...JSON.parse(raw) } as SignupData
  } catch {
    return null
  }
}

export function formatSiblings(brothersCount: number, sistersCount: number) {
  if (brothersCount <= 0 && sistersCount <= 0) return "Only child"
  const parts: string[] = []
  if (brothersCount > 0) {
    parts.push(`${brothersCount} brother${brothersCount === 1 ? "" : "s"}`)
  }
  if (sistersCount > 0) {
    parts.push(`${sistersCount} sister${sistersCount === 1 ? "" : "s"}`)
  }
  return parts.join(", ")
}

export function siblingTotal(brothersCount: number, sistersCount: number) {
  return Math.max(0, brothersCount) + Math.max(0, sistersCount)
}

export const VERIFICATION_SLA_HOURS = 12

export const SIBLING_COUNTS = [0, 1, 2, 3, 4, 5] as const

export const PROFILE_FOR_OPTIONS = [
  "Myself",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Relative",
] as const

/** Register step 1 shows a curated subset; edit page uses PROFILE_FOR_OPTIONS. */
export const REGISTER_PROFILE_FOR_OPTIONS = ["Myself", "Son", "Daughter"] as const
export const COMPLEXIONS = ["Very fair", "Fair", "Wheatish", "Wheatish brown", "Dark"]
export const DIETS = ["Vegetarian", "Non-vegetarian", "Eggetarian", "Jain", "Vegan"]
/** Habit frequency shared by smoking & alcohol (matches the habit_frequency Postgres enum). */
export const HABIT_FREQUENCY = ["Never", "Occasionally", "Regularly", "Planning to quit"] as const
/** Curated lifestyle tag cloud; member picks up to 7. Stored verbatim in lifestyle_interests.interests (jsonb). */
export const INTERESTS = [
  "✈ Travel",
  "📚 Reading",
  "🎬 Movies",
  "🎵 Music",
  "🏏 Sports",
  "🍳 Cooking",
  "🧘 Yoga",
  "🐕 Pets",
  "🌱 Gardening",
  "🎮 Gaming",
  "📷 Photography",
  "🍷 Foodie",
  "🎤 Singing",
  "💃 Dance",
  "✍ Writing",
  "🏋 Fitness",
] as const
export const MARITAL_STATUSES = ["Never Married", "Divorced", "Widowed", "Awaiting Divorce"]

export const RELIGIONS = getReligionLabels()
export const MOTHER_TONGUES = getMotherTongueLabels()
export const FAMILY_TYPES = ["Nuclear", "Joint", "Extended"] as const
export const FAMILY_VALUES = ["Traditional", "Moderate", "Liberal"] as const
export const EDUCATION_LEVELS = ["Bachelors", "Masters", "Doctorate", "Diploma", "High School"] as const
export const EMPLOYMENT_STATUSES = ["Employed", "Business Owner", "Freelancer", "Not Working"] as const
export const COMPANY_SECTORS = ["Private", "Govt", "MNC", "Startup", "Business"] as const
export const FAMILY_STATUS = [
  "Lower middle class",
  "Middle class",
  "Upper middle class",
  "Affluent",
  "Wealthy",
  "Rich",
] as const
export const PARENT_OCCUPATIONS = [
  "Employed",
  "Business",
  "Retired",
  "Homemaker",
  "Passed Away",
] as const
export const RELOCATE_OPTIONS = getRelocateLabels()
export const MANGLIK_OPTIONS = ["Yes", "No", "Don't know"]
export const PHOTO_PRIVACY = [
  { value: "blurred", label: "Always blurred" },
  { value: "accepted", label: "Unblur after interest accepted" },
  { value: "visible", label: "Always visible" },
]
export const INCOME_BANDS = [
  "Under ₹3 Lakh",
  "₹3 – 5 Lakh",
  "₹5 – 7 Lakh",
  "₹7 – 10 Lakh",
  "₹10 – 15 Lakh",
  "₹15 – 20 Lakh",
  "₹20 – 30 Lakh",
  "₹30 – 50 Lakh",
  "₹50 Lakh – 1 Crore",
  "Above ₹1 Crore",
  "Prefer not to say",
]
export const STARS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
  "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
  "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra",
  "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula",
  "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
  "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]
export const RASHIS = [
  { value: "Mesha", label: "Aries (Mesha)" },
  { value: "Vrishabha", label: "Taurus (Vrishabha)" },
  { value: "Mithuna", label: "Gemini (Mithuna)" },
  { value: "Karka", label: "Cancer (Karka)" },
  { value: "Simha", label: "Leo (Simha)" },
  { value: "Kanya", label: "Virgo (Kanya)" },
  { value: "Tula", label: "Libra (Tula)" },
  { value: "Vrishchika", label: "Scorpio (Vrishchika)" },
  { value: "Dhanu", label: "Sagittarius (Dhanu)" },
  { value: "Makara", label: "Capricorn (Makara)" },
  { value: "Kumbha", label: "Aquarius (Kumbha)" },
  { value: "Meena", label: "Pisces (Meena)" },
] as const
