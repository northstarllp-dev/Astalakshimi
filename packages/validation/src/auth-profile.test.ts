import { describe, it, expect } from "vitest"
import {
  sendOtpSchema,
  verifyOtpSchema,
  adminLoginSchema,
} from "./auth"
import {
  genderSchema,
  profileForSchema,
  maritalStatusSchema,
  optionalCompanySectorSchema,
  optionalEducationLevelSchema,
  optionalEmploymentStatusSchema,
  maritalAsksChildren,
  resolveChildrenFields,
  MARITAL_STATUSES_WITH_CHILDREN,
} from "./profile"

describe("auth.sendOtpSchema", () => {
  it("accepts valid phone + consent", () => {
    expect(sendOtpSchema.safeParse({ phone: "9876543210", consentAccepted: true }).success).toBe(true)
  })
  it("rejects without consent", () => {
    expect(sendOtpSchema.safeParse({ phone: "9876543210", consentAccepted: false }).success).toBe(false)
  })
  it("rejects invalid phone", () => {
    expect(sendOtpSchema.safeParse({ phone: "123", consentAccepted: true }).success).toBe(false)
    expect(sendOtpSchema.safeParse({ phone: "abcdefghij", consentAccepted: true }).success).toBe(false)
  })
  it("accepts phone with country code", () => {
    expect(sendOtpSchema.safeParse({ phone: "+919876543210", consentAccepted: true }).success).toBe(true)
  })
  it("accepts optional type and referredBy", () => {
    expect(
      sendOtpSchema.safeParse({ phone: "9876543210", consentAccepted: true, type: "register", referredBy: "CODE1" }).success,
    ).toBe(true)
  })
})

describe("auth.verifyOtpSchema", () => {
  it("accepts 6-digit otp", () => {
    expect(verifyOtpSchema.safeParse({ phone: "9876543210", otp: "123456" }).success).toBe(true)
  })
  it("rejects non-6-digit otp", () => {
    expect(verifyOtpSchema.safeParse({ phone: "9876543210", otp: "12345" }).success).toBe(false)
    expect(verifyOtpSchema.safeParse({ phone: "9876543210", otp: "1234567" }).success).toBe(false)
    expect(verifyOtpSchema.safeParse({ phone: "9876543210", otp: "abcdef" }).success).toBe(false)
  })
})

describe("auth.adminLoginSchema", () => {
  it("validates email + password", () => {
    expect(adminLoginSchema.safeParse({ email: "a@b.com", password: "secret1" }).success).toBe(true)
    expect(adminLoginSchema.safeParse({ email: "bad", password: "secret1" }).success).toBe(false)
    expect(adminLoginSchema.safeParse({ email: "a@b.com", password: "123" }).success).toBe(false)
  })
})

describe("profile enums", () => {
  it("genderSchema", () => {
    expect(genderSchema.safeParse("Male").success).toBe(true)
    expect(genderSchema.safeParse("Female").success).toBe(true)
    expect(genderSchema.safeParse("Other").success).toBe(true)
    expect(genderSchema.safeParse("male").success).toBe(false)
  })
  it("profileForSchema", () => {
    for (const v of ["Myself", "Son", "Daughter", "Brother", "Sister", "Relative"]) {
      expect(profileForSchema.safeParse(v).success).toBe(true)
    }
    expect(profileForSchema.safeParse("Friend").success).toBe(false)
  })
  it("maritalStatusSchema", () => {
    for (const v of ["Never Married", "Divorced", "Widowed", "Awaiting Divorce"]) {
      expect(maritalStatusSchema.safeParse(v).success).toBe(true)
    }
    expect(maritalStatusSchema.safeParse("Married").success).toBe(false)
  })
})

describe("optional enum preprocessors", () => {
  it("optionalCompanySectorSchema turns empty/null into undefined", () => {
    expect(optionalCompanySectorSchema.safeParse("").success).toBe(true)
    expect(optionalCompanySectorSchema.safeParse(null).success).toBe(true)
    expect(optionalCompanySectorSchema.safeParse("Private").success).toBe(true)
    expect(optionalCompanySectorSchema.safeParse("Nope").success).toBe(false)
  })
  it("optionalEducationLevelSchema turns empty/null into undefined", () => {
    expect(optionalEducationLevelSchema.safeParse("").success).toBe(true)
    expect(optionalEducationLevelSchema.safeParse(null).success).toBe(true)
    expect(optionalEducationLevelSchema.safeParse("Bachelors").success).toBe(true)
    expect(optionalEducationLevelSchema.safeParse("PhD").success).toBe(false)
  })
  it("optionalEmploymentStatusSchema turns empty/null into undefined", () => {
    expect(optionalEmploymentStatusSchema.safeParse("").success).toBe(true)
    expect(optionalEmploymentStatusSchema.safeParse(null).success).toBe(true)
    expect(optionalEmploymentStatusSchema.safeParse("Employed").success).toBe(true)
    expect(optionalEmploymentStatusSchema.safeParse("Retired").success).toBe(false)
  })
})

describe("maritalAsksChildren", () => {
  it("true for Divorced and Widowed", () => {
    expect(maritalAsksChildren("Divorced")).toBe(true)
    expect(maritalAsksChildren("Widowed")).toBe(true)
  })
  it("false for others", () => {
    expect(maritalAsksChildren("Never Married")).toBe(false)
    expect(maritalAsksChildren("Awaiting Divorce")).toBe(false)
    expect(maritalAsksChildren(null)).toBe(false)
    expect(maritalAsksChildren(undefined)).toBe(false)
  })
  it("MARITAL_STATUSES_WITH_CHILDREN matches", () => {
    expect(MARITAL_STATUSES_WITH_CHILDREN).toEqual(["Divorced", "Widowed"])
  })
})

describe("resolveChildrenFields", () => {
  it("returns empty children for non-asking statuses", () => {
    expect(resolveChildrenFields({ maritalStatus: "Never Married" })).toEqual({
      hasChildren: false,
      childrenCount: 0,
      childrenLivingWithMe: null,
    })
  })
  it("returns empty children when hasChildren false", () => {
    expect(resolveChildrenFields({ maritalStatus: "Divorced", hasChildren: false })).toEqual({
      hasChildren: false,
      childrenCount: 0,
      childrenLivingWithMe: null,
    })
  })
  it("clamps childrenCount to 1..10", () => {
    expect(
      resolveChildrenFields({ maritalStatus: "Divorced", hasChildren: true, childrenCount: 0, childrenLivingWithMe: true }),
    ).toEqual({ hasChildren: true, childrenCount: 1, childrenLivingWithMe: true })
    expect(
      resolveChildrenFields({ maritalStatus: "Divorced", hasChildren: true, childrenCount: 99, childrenLivingWithMe: false }),
    ).toEqual({ hasChildren: true, childrenCount: 10, childrenLivingWithMe: false })
  })
  it("preserves explicit childrenLivingWithMe true/false, null when omitted", () => {
    expect(
      resolveChildrenFields({ maritalStatus: "Widowed", hasChildren: true, childrenCount: 2, childrenLivingWithMe: true })
        .childrenLivingWithMe,
    ).toBe(true)
    expect(
      resolveChildrenFields({ maritalStatus: "Widowed", hasChildren: true, childrenCount: 2, childrenLivingWithMe: false })
        .childrenLivingWithMe,
    ).toBe(false)
    expect(
      resolveChildrenFields({ maritalStatus: "Widowed", hasChildren: true, childrenCount: 2 }).childrenLivingWithMe,
    ).toBeNull()
  })
})
