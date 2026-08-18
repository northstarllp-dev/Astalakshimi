export type VerificationMethod = "selfie" | "govt_id" | ""
export type VerificationStatus = "idle" | "pending" | "verified"

export type SignupData = {
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
  disability: string
  maritalStatus: string
  hasChildren?: boolean
  childrenCount?: number
  childrenLivingWithMe?: boolean
  religion: string
  caste: string
  subcaste: string
  gotra: string
  star: string
  rashi: string
  manglik: string
  motherTongue: string
  education: string
  educationLevel?: string
  educationStream: string
  otherEducation: string
  degree?: string
  collegeName?: string
  occupation: string
  employmentStatus?: string
  profession?: string
  otherOccupation: string
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
  willingToRelocate: string
  aboutMe: string
  prefAgeMin: number
  prefAgeMax: number
  prefHeightMinCm?: number
  prefHeightMaxCm?: number
  prefReligion: string[]
  prefCastes?: string[]
  prefMotherTongues?: string[]
  prefMinEducation?: string
  prefAcceptableIncomes?: string[]
  prefLocations?: string[]
  photos: string[]
  photoS3Keys: string[]
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
  submittedAt: string
}

export const PROFILE_STORAGE_KEY = "astalakshimi.profile"

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
  height: "165",
  weight: "",
  complexion: "",
  diet: "Vegetarian",
  disability: "",
  maritalStatus: "Never Married",
  hasChildren: false,
  childrenCount: 0,
  childrenLivingWithMe: false,
  religion: "Hindu",
  caste: "",
  subcaste: "",
  gotra: "",
  star: "",
  rashi: "",
  manglik: "Don't Know",
  motherTongue: "",
  education: "",
  educationLevel: "Bachelors",
  educationStream: "",
  otherEducation: "",
  degree: "",
  collegeName: "",
  occupation: "",
  employmentStatus: "Employed",
  profession: "",
  otherOccupation: "",
  companyName: "",
  companySector: "Private",
  annualIncome: "₹10 – 15 Lakh",
  familyValues: "Moderate",
  familyType: "Nuclear",
  familyStatus: "Middle class",
  fatherOccupation: "Employed",
  motherOccupation: "Homemaker",
  brothersCount: 0,
  sistersCount: 0,
  siblings: "",
  city: "",
  state: "Tamil Nadu",
  willingToRelocate: "Yes",
  aboutMe: "",
  prefAgeMin: 24,
  prefAgeMax: 32,
  prefHeightMinCm: 140,
  prefHeightMaxCm: 200,
  prefReligion: ["Hindu"],
  prefCastes: [],
  prefMotherTongues: [],
  prefMinEducation: "Bachelors",
  prefAcceptableIncomes: [],
  prefLocations: [],
  photos: [],
  photoS3Keys: [],
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
