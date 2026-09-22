import { describe, it, expect } from "vitest"
import {
  PROFILE_COMPLETE_THRESHOLD,
  isProfileComplete,
  canBrowseMatches,
  canInteract,
  canShortlist,
  canSubmitVerification,
  getOnboardingState,
  isVerified,
  canAccessFullPortal,
  getProfileActions,
} from "./portal-access"
import { emptySignupData, type SignupData } from "./profile-store"

function completeData(overrides: Partial<SignupData> = {}): SignupData {
  return {
    ...emptySignupData(),
    profileFor: "Myself",
    fullName: "Test User",
    gender: "Male",
    dobDay: "01",
    dobMonth: "01",
    dobYear: "2000",
    maritalStatus: "Never Married",
    city: "Mumbai",
    height: "5'9\"",
    religion: "Hindu",
    caste: "Brahmin",
    motherTongue: "Hindi",
    photos: ["x"],
    star: "Rohini",
    rashi: "Vrishabha",
    manglik: "No",
    birthTime: "10:00 AM",
    birthPlace: "Delhi",
    educationLevel: "Bachelors",
    degree: "B.Tech",
    employmentStatus: "Employed",
    profession: "Engineer",
    annualIncome: "5-10",
    diet: "Vegetarian",
    submittedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe("PROFILE_COMPLETE_THRESHOLD", () => {
  it("is 80", () => {
    expect(PROFILE_COMPLETE_THRESHOLD).toBe(80)
  })
})

describe("isProfileComplete / canBrowseMatches", () => {
  it("false for null", () => {
    expect(isProfileComplete(null)).toBe(false)
    expect(canBrowseMatches(null)).toBe(false)
  })
  it("false for empty data", () => {
    expect(isProfileComplete(emptySignupData())).toBe(false)
  })
  it("true when all required filled (browse does not need verified)", () => {
    expect(isProfileComplete(completeData())).toBe(true)
    expect(canBrowseMatches(completeData({ verificationStatus: "idle" }))).toBe(true)
    expect(canBrowseMatches(completeData({ verificationStatus: "pending" }))).toBe(true)
  })
  it("false when a required field missing", () => {
    expect(isProfileComplete(completeData({ star: "" }))).toBe(false)
  })
})

describe("canInteract / canShortlist / canSubmitVerification", () => {
  it("canInteract requires verified + complete", () => {
    expect(canInteract(completeData({ verificationStatus: "pending" }))).toBe(false)
    expect(canInteract(completeData({ verificationStatus: "idle" }))).toBe(false)
    expect(canInteract(completeData({ verificationStatus: "verified" }))).toBe(true)
    expect(canInteract(completeData({ verificationStatus: "verified", star: "" }))).toBe(false)
  })
  it("canShortlist only needs complete", () => {
    expect(canShortlist(completeData({ verificationStatus: "idle" }))).toBe(true)
    expect(canShortlist(completeData({ star: "" }))).toBe(false)
  })
  it("canSubmitVerification when complete and not pending/verified", () => {
    expect(canSubmitVerification(completeData({ verificationStatus: "idle" }))).toBe(true)
    expect(canSubmitVerification(completeData({ verificationStatus: "rejected" }))).toBe(true)
    expect(canSubmitVerification(completeData({ verificationStatus: "pending" }))).toBe(false)
    expect(canSubmitVerification(completeData({ verificationStatus: "verified" }))).toBe(false)
    expect(canSubmitVerification(completeData({ verificationStatus: "idle", star: "" }))).toBe(false)
  })
})

describe("getOnboardingState", () => {
  it("maps verification + completeness to states", () => {
    expect(getOnboardingState(null)).toBe("incomplete")
    expect(getOnboardingState(completeData({ star: "" }))).toBe("incomplete")
    expect(getOnboardingState(completeData({ verificationStatus: "idle" }))).toBe("ready_to_submit")
    expect(getOnboardingState(completeData({ verificationStatus: "pending" }))).toBe("pending")
    expect(getOnboardingState(completeData({ verificationStatus: "rejected" }))).toBe("rejected")
    expect(getOnboardingState(completeData({ verificationStatus: "verified" }))).toBe("verified")
  })
})

describe("isVerified", () => {
  it("true only for 'verified'", () => {
    expect(isVerified("verified")).toBe(true)
    expect(isVerified("pending")).toBe(false)
    expect(isVerified("rejected")).toBe(false)
    expect(isVerified("idle")).toBe(false)
    expect(isVerified(undefined)).toBe(false)
  })
})

describe("canAccessFullPortal", () => {
  it("false for null", () => {
    expect(canAccessFullPortal(null)).toBe(false)
  })
  it("false when not verified", () => {
    expect(canAccessFullPortal(completeData({ verificationStatus: "pending" }))).toBe(false)
  })
  it("false when profile incomplete", () => {
    expect(canAccessFullPortal(completeData({ verificationStatus: "verified", star: "" }))).toBe(false)
  })
  it("true when verified and complete", () => {
    expect(canAccessFullPortal(completeData({ verificationStatus: "verified" }))).toBe(true)
  })
})

describe("getProfileActions", () => {
  it("returns 6 actions", () => {
    expect(getProfileActions(null)).toHaveLength(6)
  })
  it("marks done based on data", () => {
    const actions = getProfileActions(completeData())
    const byId = Object.fromEntries(actions.map((a) => [a.id, a.done]))
    expect(byId.photos).toBe(true)
    expect(byId.career).toBe(true)
    expect(byId.horoscope).toBe(true)
  })
  it("verify label reflects status", () => {
    const pending = getProfileActions(completeData({ verificationStatus: "pending" }))
    expect(pending.find((a) => a.id === "verify")?.label).toBe("Verification in progress")
    const rejected = getProfileActions(completeData({ verificationStatus: "rejected" }))
    expect(rejected.find((a) => a.id === "verify")?.label).toBe("Re-upload verification")
    const idle = getProfileActions(completeData({ verificationStatus: "idle" }))
    expect(idle.find((a) => a.id === "verify")?.label).toBe("Get verified")
  })
  it("verify done only when verified", () => {
    const verified = getProfileActions(completeData({ verificationStatus: "verified" }))
    expect(verified.find((a) => a.id === "verify")?.done).toBe(true)
  })
})
