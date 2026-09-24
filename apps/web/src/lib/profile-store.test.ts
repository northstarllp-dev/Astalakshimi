import { describe, it, expect, beforeEach } from "vitest"
import {
  emptySignupData,
  sanitizeSignupDraftData,
  getPrimaryPhotoSrc,
  inferSignupResumeStep,
  seedPreferenceDefaults,
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
    expect(d.consentAccepted).toBe(false)
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

describe("getPrimaryPhotoSrc", () => {
  it("prefers S3 keys over blob previews", () => {
    expect(
      getPrimaryPhotoSrc({
        photos: ["blob:preview"],
        photoS3Keys: ["profiles/u/photo.jpg"],
      }),
    ).toBe("profiles/u/photo.jpg")
  })

  it("returns null when only blob previews exist", () => {
    expect(getPrimaryPhotoSrc({ photos: ["blob:x"], photoS3Keys: [] })).toBeNull()
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
      diet: "Vegetarian",
    }
    expect(inferSignupResumeStep(d)).toBe(4)
  })
  it("returns 5 after community complete (preferences next)", () => {
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
      diet: "Vegetarian",
      religion: "Hindu",
      caste: "Brahmin",
      motherTongue: "Hindi",
    }
    expect(inferSignupResumeStep(d)).toBe(5)
  })
  it("returns 5 when community is done but preferences are not set", () => {
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
      diet: "Vegetarian",
      religion: "Hindu",
      caste: "Brahmin",
      motherTongue: "Hindi",
      // Photos + verification ready, but no preferences yet.
      photos: ["x"],
      verificationMethod: "selfie",
      selfiePhoto: "selfie.jpg",
    }
    expect(inferSignupResumeStep(d)).toBe(5)
  })
  it("returns 6 once preferences are set but photos are missing", () => {
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
      diet: "Vegetarian",
      religion: "Hindu",
      caste: "Brahmin",
      motherTongue: "Hindi",
      prefReligion: ["Hindu"],
      prefMaritalStatuses: ["Never Married"],
      prefAgeMin: 25,
      prefAgeMax: 33,
    }
    expect(inferSignupResumeStep(d)).toBe(6)
  })
  it("returns 6 when preferences, photo and identity are all ready", () => {
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
      diet: "Vegetarian",
      religion: "Hindu",
      caste: "Brahmin",
      motherTongue: "Hindi",
      prefReligion: ["Hindu"],
      prefMaritalStatuses: ["Never Married"],
      prefAgeMin: 25,
      prefAgeMax: 33,
      photos: ["x"],
      verificationMethod: "selfie",
      selfiePhoto: "selfie.jpg",
    }
    expect(inferSignupResumeStep(d)).toBe(6)
  })
  it("does not treat a partial age range as preferences complete", () => {
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
      diet: "Vegetarian",
      religion: "Hindu",
      caste: "Brahmin",
      motherTongue: "Hindi",
      prefReligion: ["Hindu"],
      prefAgeMin: 25,
      // prefAgeMax missing
    }
    expect(inferSignupResumeStep(d)).toBe(5)
  })
})

describe("signup draft persistence", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  it("saves and loads a draft, clamping step to 1..6", () => {
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

describe("seedPreferenceDefaults", () => {
  /** Fixed "today" so the age window is deterministic. */
  const REF = new Date("2026-09-20T00:00:00Z")

  const community = {
    ...emptySignupData(),
    dobDay: "15",
    dobMonth: "06",
    dobYear: "1995", // 31 on REF
    religion: "Hindu",
    caste: "Brahmin",
    motherTongue: "Tamil",
    city: "Chennai",
  }

  it("mirrors the member's own community, tongue and city", () => {
    const seed = seedPreferenceDefaults(community as SignupData, REF)
    expect(seed.prefReligion).toEqual(["Hindu"])
    expect(seed.prefCastes).toEqual(["Brahmin"])
    expect(seed.prefMotherTongues).toEqual(["Tamil"])
    expect(seed.prefLocations).toEqual(["Chennai"])
    expect(seed.prefMaritalStatuses).toBeUndefined()
    expect(seed.prefHeightMinCm).toBeUndefined()
    expect(seed.prefHeightMaxCm).toBeUndefined()
  })

  it("seeds an age window around the member's own age", () => {
    const seed = seedPreferenceDefaults(community as SignupData, REF)
    expect(seed.prefAgeMin).toBe(29) // 31 - 2
    expect(seed.prefAgeMax).toBe(36) // 31 + 5
  })

  it("falls back to the engine age window when the dob is missing", () => {
    const noDob = { ...emptySignupData(), religion: "Hindu", caste: "Brahmin", motherTongue: "Tamil" }
    const seed = seedPreferenceDefaults(noDob as SignupData, REF)
    expect(seed.prefAgeMin).toBe(21)
    expect(seed.prefAgeMax).toBe(35)
  })

  it("never overwrites an explicit preference", () => {
    const chosen = {
      ...community,
      prefAgeMin: 40,
      prefAgeMax: 45,
      prefReligion: ["Jain"],
      prefCastes: ["Agarwal"],
      prefMotherTongues: ["Hindi"],
      prefLocations: ["Mumbai"],
      prefMaritalStatuses: ["Divorced"],
      prefHeightMinCm: 160,
      prefHeightMaxCm: 180,
    }
    const seed = seedPreferenceDefaults(chosen as SignupData, REF)
    expect(seed.prefAgeMin).toBeUndefined()
    expect(seed.prefAgeMax).toBeUndefined()
    expect(seed.prefReligion).toBeUndefined()
    expect(seed.prefCastes).toBeUndefined()
    expect(seed.prefMotherTongues).toBeUndefined()
    expect(seed.prefLocations).toBeUndefined()
    expect(seed.prefMaritalStatuses).toBeUndefined()
    expect(seed.prefHeightMinCm).toBeUndefined()
    expect(seed.prefHeightMaxCm).toBeUndefined()
  })

  it("still fills the fields the member left empty alongside set ones", () => {
    const partial = { ...community, prefAgeMin: 30, prefAgeMax: 38 }
    const seed = seedPreferenceDefaults(partial as SignupData, REF)
    expect(seed.prefAgeMin).toBeUndefined()
    expect(seed.prefReligion).toEqual(["Hindu"])
    expect(seed.prefLocations).toEqual(["Chennai"])
  })

  it("clamps the seeded window into the 18-80 allowed range", () => {
    const young = { ...community, dobDay: "15", dobMonth: "06", dobYear: "2006" } // 20
    const youngSeed = seedPreferenceDefaults(young as SignupData, REF)
    expect(youngSeed.prefAgeMin).toBe(18)
    const older = { ...community, dobDay: "15", dobMonth: "06", dobYear: "1960" } // 66
    const olderSeed = seedPreferenceDefaults(older as SignupData, REF)
    expect(olderSeed.prefAgeMax).toBe(71)
  })

  it("does not invent a community preference when the member has none", () => {
    const bare = { ...emptySignupData() }
    const seed = seedPreferenceDefaults(bare as SignupData, REF)
    expect(seed.prefReligion).toBeUndefined()
    expect(seed.prefCastes).toBeUndefined()
    expect(seed.prefMotherTongues).toBeUndefined()
    expect(seed.prefLocations).toBeUndefined()
    // The age window + defaults are still seeded.
    expect(seed.prefAgeMin).toBe(21)
    expect(seed.prefAgeMax).toBe(35)
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
