export type VerificationMethod = "selfie" | "govt_id" | ""
export type VerificationStatus = "idle" | "pending" | "verified"

export type SignupData = {
  phone: string
  otp: string
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
  disability: string
  maritalStatus: string
  religion: string
  caste: string
  subcaste: string
  gotra: string
  star: string
  rashi: string
  manglik: string
  motherTongue: string
  education: string
  educationStream: string
  otherEducation: string
  occupation: string
  otherOccupation: string
  companyName: string
  annualIncome: string
  familyType: string
  familyStatus: string
  fatherOccupation: string
  motherOccupation: string
  brothersCount: number
  sistersCount: number
  siblings: string
  city: string
  state: string
  willingToRelocate: string
  aboutMe: string
  prefAgeMin: number
  prefAgeMax: number
  prefReligion: string[]
  photos: string[]
  photoPrivacy: string
  verificationMethod: VerificationMethod
  selfiePhoto: string
  govtIdType: string
  govtIdPhoto: string
  horoscopeName: string
  horoscopeSize: number
  birthTime: string
  birthPlace: string
  verificationStatus: VerificationStatus
  submittedAt: string
}

export const PROFILE_STORAGE_KEY = "astalakshimi.profile"

export const emptySignupData = (): SignupData => ({
  phone: "",
  otp: "",
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
  disability: "",
  maritalStatus: "",
  religion: "",
  caste: "",
  subcaste: "",
  gotra: "",
  star: "",
  rashi: "",
  manglik: "",
  motherTongue: "",
  education: "",
  educationStream: "",
  otherEducation: "",
  occupation: "",
  otherOccupation: "",
  companyName: "",
  annualIncome: "",
  familyType: "",
  familyStatus: "",
  fatherOccupation: "",
  motherOccupation: "",
  brothersCount: 0,
  sistersCount: 0,
  siblings: "",
  city: "",
  state: "",
  willingToRelocate: "",
  aboutMe: "",
  prefAgeMin: 24,
  prefAgeMax: 34,
  prefReligion: ["Hindu"],
  photos: [],
  photoPrivacy: "blurred",
  verificationMethod: "",
  selfiePhoto: "",
  govtIdType: "",
  govtIdPhoto: "",
  horoscopeName: "",
  horoscopeSize: 0,
  birthTime: "",
  birthPlace: "",
  verificationStatus: "idle",
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
  sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data))
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

export const COMPLEXIONS = ["Very fair", "Fair", "Wheatish", "Wheatish brown", "Dark"]
export const DIETS = ["Vegetarian", "Non-vegetarian", "Eggetarian", "Vegan", "Jain"]
export const MARITAL_STATUSES = ["Never Married", "Divorced", "Widowed", "Awaiting Divorce"]
export const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"]
export const MOTHER_TONGUES = [
  "Tamil", "Telugu", "Hindi", "Malayalam", "Kannada",
  "Marathi", "Bengali", "Gujarati", "Punjabi", "Other",
]
export const FAMILY_TYPES = ["Nuclear", "Joint"]
export const FAMILY_STATUS = ["Middle class", "Upper middle class", "Affluent", "Rich"]
export const RELOCATE_OPTIONS = ["Yes", "No", "Open to discussion"]
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
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
]
