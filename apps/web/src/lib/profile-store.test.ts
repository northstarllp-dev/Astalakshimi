import { describe, it, expect, beforeEach } from "vitest"
import {
  emptySignupData,
  sanitizeSignupDraftData,
  inferSignupResumeStep,
  saveSignupDraft,
  loadSignupDraft,
  clearSignupDraft,
  getPrefix,
  SIGNUP_DRAFT_KEY,
  SIGNUP_TOTAL_STEPS,
  type SignupData,
} from "./profile-store"

describe("emptySignupData", () => {
  it("returns a fully-initialized object", () => {
    const d = emptySignupData()
    expect(d.phone).toBe("")
    expect(d.consentAccepted).toBe(true)
    expect(d.photos).toEqual([])
    expect(d.photoS3Keys).toEqual([])
    expect(d.verificationStatus).toBe("idle")
    expect(d.brothersCount).toBe(0)
  })
})

describe("sanitizeSignupDraftData", () => {
  it("clears otp", () => {
    const d = { ...emptySignupData(), otp: "123456" }
    expect(sanitizeSignupDraftData(d).otp).toBe("")
  })
  it("drops blob/data photo URLs, keeps S3 keys", () => {
    const d = {
      ...emptySignupData(),
      photos: ["blob:xyz", "data:image/png;base64,aaa", "https://cdn/x.jpg"],
      photoS3Keys: ["profiles/u/1.jpg"],
    }
    const out = sanitizeSignupDraftData(d)
    // photos rebuilt from s3 keys when present
    expect(out.photos).toEqual(["profiles/u/1.jpg"])
    expect(out.photoS3Keys).toEqual(["profiles/u/1.jpg"])
  })
  it("keeps non-transient photos when no s3 keys", () => {
    const d = { ...emptySignupData(), photos: ["https://cdn/x.jpg", "blob:y"], photoS3Keys: [] }
    expect(sanitizeSignupDraftData(d).photos).toEqual(["https://cdn/x.jpg"])
  })
  it("falls back to s3 key for selfie when transient", () => {
    const d = { ...emptySignupData(), selfiePhoto: "blob:selfie", selfieS3Key: "selfie-key" }
    expect(sanitizeSignupDraftData(d).selfiePhoto).toBe("selfie-key")
  })
})

describe("inferSignupResumeStep", () => {
  it("returns 1 for empty data", () => {
    expect(inferSignupResumeStep(emptySignupData())).toBe(1)
  })
  it("returns 2 after step1 complete", () => {
    const d = { ...emptySignupData(), profileFor: "Myself", phone: "9876543210" }
    expect(inferSignupResumeStep(d)).toBe(2)
  })
  it("returns 4 after identity complete", () => {
    const d: SignupData = {
      ...emptySignupData(),
      profileFor: "Myself",
      phone: "9876543210",
      fullName: "Test User",
      gender: "Male",
      dobDay: "01",
      dobMonth: "01",
      dobYear: "2000",
      maritalStatus: "Never Married",
      city: "Mumbai",
      height: "5'9\"",
    }
    expect(inferSignupResumeStep(d)).toBe(4)
  })
  it("returns 5 after community complete", () => {
    const d: SignupData = {
      ...emptySignupData(),
      profileFor: "Myself",
      phone: "9876543210",
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
    }
    expect(inferSignupResumeStep(d)).toBe(5)
  })
  it("returns 5 when photo + identity ready", () => {
    const d: SignupData = {
      ...emptySignupData(),
      profileFor: "Myself",
      phone: "9876543210",
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
      verificationMethod: "selfie",
      selfiePhoto: "selfie.jpg",
    }
    expect(inferSignupResumeStep(d)).toBe(5)
  })
})

describe("signup draft persistence", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  it("saves and loads a draft, clamping step to 1..5", () => {
    const d = { ...emptySignupData(), profileFor: "Myself", phone: "9876543210" }
    saveSignupDraft(d, 99)
    const loaded = loadSignupDraft()
    expect(loaded).not.toBeNull()
    expect(loaded!.step).toBeLessThanOrEqual(SIGNUP_TOTAL_STEPS)
    expect(loaded!.data.profileFor).toBe("Myself")
  })
  it("returns null when no draft", () => {
    expect(loadSignupDraft()).toBeNull()
  })
  it("clearSignupDraft removes the draft", () => {
    saveSignupDraft(emptySignupData(), 2)
    clearSignupDraft()
    expect(loadSignupDraft()).toBeNull()
  })
  it("prefers furthest of saved step and inferred progress", () => {
    const d = { ...emptySignupData(), profileFor: "Myself", phone: "9876543210" } // infers step 2
    saveSignupDraft(d, 1)
    const loaded = loadSignupDraft()
    expect(loaded!.step).toBeGreaterThanOrEqual(2)
  })
})

describe("getPrefix", () => {
  it("maps profileFor to possessive", () => {
    expect(getPrefix("Myself")).toBe("Your")
    expect(getPrefix("Son")).toBe("Son's")
    expect(getPrefix("Daughter")).toBe("Daughter's")
    expect(getPrefix("Brother")).toBe("Brother's")
    expect(getPrefix("Sister")).toBe("Sister's")
    expect(getPrefix("Relative")).toBe("Relative's")
    expect(getPrefix("Friend")).toBe("Friend's")
    expect(getPrefix("Unknown")).toBe("")
  })
})
