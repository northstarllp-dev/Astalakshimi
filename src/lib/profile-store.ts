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
  maritalStatus: string
  religion: string
  caste: string
  motherTongue: string
  education: string
  otherEducation: string
  occupation: string
  otherOccupation: string
  companyName: string
  annualIncome: string
  city: string
  prefAgeMin: number
  prefAgeMax: number
  prefReligion: string[]
  photos: string[]
  verificationMethod: VerificationMethod
  selfiePhoto: string
  govtIdType: string
  govtIdPhoto: string
  horoscopeName: string
  horoscopeSize: number
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
  maritalStatus: "",
  religion: "",
  caste: "",
  motherTongue: "",
  education: "",
  otherEducation: "",
  occupation: "",
  otherOccupation: "",
  companyName: "",
  annualIncome: "",
  city: "",
  prefAgeMin: 24,
  prefAgeMax: 34,
  prefReligion: ["Hindu"],
  photos: [],
  verificationMethod: "",
  selfiePhoto: "",
  govtIdType: "",
  govtIdPhoto: "",
  horoscopeName: "",
  horoscopeSize: 0,
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

export const VERIFICATION_SLA_HOURS = 12
