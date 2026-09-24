import { describe, it, expect } from "vitest"
import {
  phoneSchema,
  otpSchema,
  loginPhoneSchema,
  loginOtpSchema,
  heroRegisterSchema,
  signupStep1Schema,
  signupStep2Schema,
  signupStep3Schema,
  signupStep5Schema,
  signupStepPreferencesSchema,
  profileEditSchema,
  searchFiltersSchema,
  discoverQuickSchema,
  planSelectSchema,
  checkoutSchema,
  adminLoginSchema,
  adminRejectSchema,
  adminCreateProfileSchema,
} from "./validation"

describe("phoneSchema", () => {
  it("accepts valid 10-digit starting 6-9", () => {
    expect(phoneSchema.safeParse("9876543210").success).toBe(true)
    expect(phoneSchema.safeParse("6123456789").success).toBe(true)
  })
  it("rejects invalid", () => {
    expect(phoneSchema.safeParse("1234567890").success).toBe(false) // starts with 1
    expect(phoneSchema.safeParse("987654321").success).toBe(false) // 9 digits
    expect(phoneSchema.safeParse("98765432101").success).toBe(false) // 11 digits
    expect(phoneSchema.safeParse("abcdefghij").success).toBe(false)
  })
})

describe("otpSchema", () => {
  it("accepts 6 digits", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true)
  })
  it("rejects non-6-digit", () => {
    expect(otpSchema.safeParse("12345").success).toBe(false)
    expect(otpSchema.safeParse("1234567").success).toBe(false)
    expect(otpSchema.safeParse("abcdef").success).toBe(false)
  })
})

describe("login schemas", () => {
  it("loginPhoneSchema wraps phone", () => {
    expect(loginPhoneSchema.safeParse({ phone: "9876543210" }).success).toBe(true)
    expect(loginPhoneSchema.safeParse({ phone: "123" }).success).toBe(false)
  })
  it("loginOtpSchema wraps otp", () => {
    expect(loginOtpSchema.safeParse({ otp: "123456" }).success).toBe(true)
    expect(loginOtpSchema.safeParse({ otp: "12" }).success).toBe(false)
  })
})

describe("heroRegisterSchema", () => {
  it("accepts valid", () => {
    expect(
      heroRegisterSchema.safeParse({ looking: "Bride", age: 25, motherTongue: "Hindi" }).success,
    ).toBe(true)
  })
  it("coerces age string to number", () => {
    const r = heroRegisterSchema.safeParse({ looking: "Groom", age: "25", motherTongue: "Hindi" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.age).toBe(25)
  })
  it("rejects age < 18", () => {
    expect(heroRegisterSchema.safeParse({ looking: "Bride", age: 17, motherTongue: "Hindi" }).success).toBe(false)
  })
  it("rejects age > 70", () => {
    expect(heroRegisterSchema.safeParse({ looking: "Bride", age: 71, motherTongue: "Hindi" }).success).toBe(false)
  })
  it("rejects empty motherTongue", () => {
    expect(heroRegisterSchema.safeParse({ looking: "Bride", age: 25, motherTongue: "" }).success).toBe(false)
  })
})

describe("signupStep1Schema", () => {
  it("requires terms accepted", () => {
    expect(
      signupStep1Schema.safeParse({ profileFor: "Myself", phone: "9876543210", terms: true }).success,
    ).toBe(true)
    expect(
      signupStep1Schema.safeParse({ profileFor: "Myself", phone: "9876543210", terms: false }).success,
    ).toBe(false)
  })
})

describe("signupStep2Schema", () => {
  const base = {
    fullName: "Test User",
    gender: "Male",
    dobDay: "01",
    dobMonth: "01",
    dobYear: "2000",
    maritalStatus: "Never Married",
    diet: "Vegetarian",
    city: "Mumbai",
    height: "5'9\"",
  }
  it("accepts valid", () => {
    expect(signupStep2Schema.safeParse(base).success).toBe(true)
  })
  it("rejects name with digits", () => {
    expect(signupStep2Schema.safeParse({ ...base, fullName: "Test123" }).success).toBe(false)
  })
  it("rejects under-age (male < 21)", () => {
    const r = signupStep2Schema.safeParse({ ...base, dobYear: "2010" })
    expect(r.success).toBe(false)
  })
  it("rejects invalid height", () => {
    expect(signupStep2Schema.safeParse({ ...base, height: "abc" }).success).toBe(false)
  })
  it("requires children fields when Divorced", () => {
    const r = signupStep2Schema.safeParse({ ...base, maritalStatus: "Divorced" })
    expect(r.success).toBe(false)
  })
  it("accepts Divorced with children fields", () => {
    const r = signupStep2Schema.safeParse({
      ...base,
      maritalStatus: "Divorced",
      hasChildren: true,
      childrenCount: 2,
      childrenLivingWithMe: false,
    })
    expect(r.success).toBe(true)
  })
})

describe("signupStep3Schema", () => {
  it("requires religion, caste, motherTongue", () => {
    expect(
      signupStep3Schema.safeParse({ religion: "Hindu", caste: "Brahmin", motherTongue: "Hindi" }).success,
    ).toBe(true)
    expect(signupStep3Schema.safeParse({ religion: "", caste: "Brahmin", motherTongue: "Hindi" }).success).toBe(false)
    expect(signupStep3Schema.safeParse({ religion: "Hindu", caste: "B", motherTongue: "Hindi" }).success).toBe(false)
  })
})

describe("signupStep5Schema", () => {
  it("requires 6-digit otp", () => {
    expect(signupStep5Schema.safeParse({ otp: "123456" }).success).toBe(true)
    expect(signupStep5Schema.safeParse({ otp: "123" }).success).toBe(false)
  })
})

describe("signupStepPreferencesSchema", () => {
  const base = {
    prefAgeMin: 25,
    prefAgeMax: 33,
    prefReligion: ["Hindu"],
    prefMaritalStatuses: ["Never Married"],
  }

  it("accepts the required minimum (age range + religion + marital status)", () => {
    expect(signupStepPreferencesSchema.safeParse(base).success).toBe(true)
  })

  it("accepts a full scoring-relevant preference set", () => {
    const result = signupStepPreferencesSchema.safeParse({
      ...base,
      prefHeightMinCm: 150,
      prefHeightMaxCm: 190,
      prefMaritalStatuses: ["Never Married", "Divorced"],
      prefCastes: ["Iyer"],
      prefMotherTongues: ["Tamil"],
      prefMinEducation: "Bachelors",
      prefLocations: ["Chennai", "Bengaluru"],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.prefCastes).toEqual(["Iyer"])
      expect(result.data.prefLocations).toEqual(["Chennai", "Bengaluru"])
    }
  })

  it("accepts the 'same as me' pre-fill (own religion/caste/tongue/city)", () => {
    expect(
      signupStepPreferencesSchema.safeParse({
        ...base,
        prefReligion: ["Muslim"],
        prefCastes: ["Sunni"],
        prefMotherTongues: ["Urdu"],
        prefLocations: ["Hyderabad"],
      }).success,
    ).toBe(true)
  })

  it("rejects a missing preferred marital status", () => {
    const result = signupStepPreferencesSchema.safeParse({ ...base, prefMaritalStatuses: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("prefMaritalStatuses"))).toBe(true)
    }
  })

  it("rejects a missing preferred religion", () => {
    const result = signupStepPreferencesSchema.safeParse({ ...base, prefReligion: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("prefReligion"))).toBe(true)
      expect(result.error.issues.some((i) => i.message.includes("at least one preferred religion"))).toBe(true)
    }
  })

  it("rejects a missing minimum age", () => {
    const result = signupStepPreferencesSchema.safeParse({ ...base, prefAgeMin: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("prefAgeMin"))).toBe(true)
    }
  })

  it("rejects a missing maximum age", () => {
    const result = signupStepPreferencesSchema.safeParse({ ...base, prefAgeMax: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("prefAgeMax"))).toBe(true)
    }
  })

  it("rejects an inverted age range", () => {
    const result = signupStepPreferencesSchema.safeParse({ ...base, prefAgeMin: 40, prefAgeMax: 30 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("cannot be above maximum age")),
      ).toBe(true)
    }
  })

  it("rejects out-of-bounds ages (below 18 / above 80)", () => {
    expect(signupStepPreferencesSchema.safeParse({ ...base, prefAgeMin: 17 }).success).toBe(false)
    expect(signupStepPreferencesSchema.safeParse({ ...base, prefAgeMax: 81 }).success).toBe(false)
  })

  it("rejects a non-integer age", () => {
    expect(signupStepPreferencesSchema.safeParse({ ...base, prefAgeMin: 25.5 }).success).toBe(false)
  })

  it("rejects an inverted height range", () => {
    const result = signupStepPreferencesSchema.safeParse({
      ...base,
      prefHeightMinCm: 190,
      prefHeightMaxCm: 150,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("cannot be above maximum height")),
      ).toBe(true)
    }
  })

  it("allows a one-sided height range (the engine scores each end independently)", () => {
    expect(signupStepPreferencesSchema.safeParse({ ...base, prefHeightMinCm: 150 }).success).toBe(true)
    expect(signupStepPreferencesSchema.safeParse({ ...base, prefHeightMaxCm: 190 }).success).toBe(true)
  })

  it("keeps the soft-score fields optional", () => {
    const result = signupStepPreferencesSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.prefCastes).toBeUndefined()
      expect(result.data.prefMinEducation).toBeUndefined()
    }
  })
})

describe("profileEditSchema", () => {
  const base = {
    phone: "",
    fullName: "Test User",
    profileFor: "Myself",
    gender: "Male",
    dobDay: "01",
    dobMonth: "01",
    dobYear: "2000",
    maritalStatus: "Never Married",
    religion: "Hindu",
    motherTongue: "Hindi",
    city: "Mumbai",
    prefReligion: ["Hindu"],
    prefMaritalStatuses: ["Never Married"],
    aboutMe: "Hello",
    prefAgeMin: 24,
    prefAgeMax: 30,
    brothersCount: 1,
    sistersCount: 1,
  }
  it("accepts valid", () => {
    expect(profileEditSchema.safeParse(base).success).toBe(true)
  })
  it("rejects prefAgeMin > prefAgeMax", () => {
    const r = profileEditSchema.safeParse({ ...base, prefAgeMin: 30, prefAgeMax: 24 })
    expect(r.success).toBe(false)
  })
  it("rejects empty prefReligion", () => {
    const r = profileEditSchema.safeParse({ ...base, prefReligion: [] })
    expect(r.success).toBe(false)
  })
  it("rejects empty prefMaritalStatuses", () => {
    const r = profileEditSchema.safeParse({ ...base, prefMaritalStatuses: [] })
    expect(r.success).toBe(false)
  })
  it("allows empty phone", () => {
    expect(profileEditSchema.safeParse({ ...base, phone: "" }).success).toBe(true)
  })
  it("rejects invalid phone", () => {
    expect(profileEditSchema.safeParse({ ...base, phone: "123" }).success).toBe(false)
  })
})

describe("searchFiltersSchema", () => {
  const base = {
    q: "",
    city: "",
    community: "",
    motherTongue: "",
    education: "",
    income: "",
    ageMin: 21,
    ageMax: 40,
    photoVerified: false,
    hasHoroscope: false,
  }
  it("accepts valid", () => {
    expect(searchFiltersSchema.safeParse(base).success).toBe(true)
  })
  it("rejects ageMin > ageMax", () => {
    expect(searchFiltersSchema.safeParse({ ...base, ageMin: 40, ageMax: 21 }).success).toBe(false)
  })
})

describe("discoverQuickSchema", () => {
  it("accepts valid", () => {
    expect(discoverQuickSchema.safeParse({ ageMin: 21, ageMax: 40, city: "", community: "" }).success).toBe(true)
  })
  it("rejects ageMin > ageMax", () => {
    expect(discoverQuickSchema.safeParse({ ageMin: 40, ageMax: 21, city: "", community: "" }).success).toBe(false)
  })
})

describe("planSelectSchema", () => {
  it("accepts valid plan ids", () => {
    for (const id of ["free", "silver", "gold", "platinum", "diamond"]) {
      expect(planSelectSchema.safeParse({ planId: id }).success).toBe(true)
    }
  })
  it("rejects unknown plan", () => {
    expect(planSelectSchema.safeParse({ planId: "ruby" }).success).toBe(false)
  })
})

describe("checkoutSchema", () => {
  it("accepts non-upi paid plan without upiId", () => {
    expect(checkoutSchema.safeParse({ method: "card", upiId: "", paidPlan: true }).success).toBe(true)
  })
  it("requires upiId for upi paid plan", () => {
    expect(checkoutSchema.safeParse({ method: "upi", upiId: "", paidPlan: true }).success).toBe(false)
    expect(checkoutSchema.safeParse({ method: "upi", upiId: "user@bank", paidPlan: true }).success).toBe(true)
  })
  it("allows free plan without upiId", () => {
    expect(checkoutSchema.safeParse({ method: "upi", upiId: "", paidPlan: false }).success).toBe(true)
  })
})

describe("admin schemas", () => {
  it("adminLoginSchema validates email + password", () => {
    expect(adminLoginSchema.safeParse({ email: "a@b.com", password: "secret1" }).success).toBe(true)
    expect(adminLoginSchema.safeParse({ email: "not-an-email", password: "secret1" }).success).toBe(false)
    expect(adminLoginSchema.safeParse({ email: "a@b.com", password: "123" }).success).toBe(false)
  })
  it("adminRejectSchema requires >=10 char reason", () => {
    expect(adminRejectSchema.safeParse({ rejectionReason: "too short" }).success).toBe(false)
    expect(adminRejectSchema.safeParse({ rejectionReason: "This is a clear reason." }).success).toBe(true)
  })
  it("adminCreateProfileSchema validates dob age", () => {
    const base = {
      profileFor: "Myself",
      phone: "9876543210",
      fullName: "Test User",
      gender: "Male" as const,
      dobDay: "01",
      dobMonth: "01",
      dobYear: "2000",
      maritalStatus: "Never Married" as const,
      height: "170",
      diet: "Vegetarian" as const,
      city: "Mumbai",
      religion: "Hindu",
      caste: "Brahmin",
      motherTongue: "Hindi",
      educationLevel: "Bachelors",
      employmentStatus: "Employed",
      annualIncome: "Prefer not to say",
      nakshatra: "Ashwini",
      rashi: "Mesha",
      manglik: "No" as const,
      birthTime: "10:00 AM",
      birthPlace: "Mumbai",
      brothersCount: 0,
      sistersCount: 0,
      prefAgeMin: 25,
      prefAgeMax: 32,
      prefMaritalStatuses: ["Never Married"],
      prefReligions: ["Hindu"],
    }
    expect(adminCreateProfileSchema.safeParse(base).success).toBe(true)
    expect(adminCreateProfileSchema.safeParse({ ...base, dobYear: "2015" }).success).toBe(false)
    expect(adminCreateProfileSchema.safeParse({ ...base, prefMaritalStatuses: [] }).success).toBe(false)
    expect(adminCreateProfileSchema.safeParse({ ...base, prefReligions: [] }).success).toBe(false)
  })
})
