import { describe, it, expect } from "vitest"
import { ApiError } from "@/lib/api-client"
import {
  contactQuotaHint,
  formatContactQuotaUsage,
  isContactQuotaError,
  isContactQuotaExhausted,
} from "./contact-quota"

describe("isContactQuotaExhausted", () => {
  it("is true when Free has used all 3", () => {
    expect(
      isContactQuotaExhausted({
        planSlug: "free",
        limit: 3,
        usedThisMonth: 3,
        remaining: 0,
        periodLabel: "this month",
      }),
    ).toBe(true)
  })

  it("is true when Silver has used all 10", () => {
    expect(
      isContactQuotaExhausted({
        planSlug: "silver",
        limit: 10,
        usedThisMonth: 10,
        remaining: 0,
      }),
    ).toBe(true)
  })

  it("is false for Gold unlimited", () => {
    expect(
      isContactQuotaExhausted({
        planSlug: "gold",
        limit: null,
        usedThisMonth: 40,
        remaining: null,
      }),
    ).toBe(false)
  })

  it("is false when a credit remains", () => {
    expect(
      isContactQuotaExhausted({
        planSlug: "free",
        limit: 3,
        usedThisMonth: 2,
        remaining: 1,
      }),
    ).toBe(false)
  })
})

describe("formatContactQuotaUsage", () => {
  it("shows one credit left", () => {
    expect(
      formatContactQuotaUsage({
        planSlug: "free",
        limit: 3,
        usedThisMonth: 2,
        remaining: 1,
        periodLabel: "this month",
      }),
    ).toBe("2 / 3 this month · 1 left")
  })

  it("shows none left at the Silver cap", () => {
    expect(
      formatContactQuotaUsage({
        planSlug: "silver",
        limit: 10,
        usedThisMonth: 10,
        remaining: 0,
        periodLabel: "this month",
      }),
    ).toBe("10 / 10 this month · none left")
  })

  it("shows unlimited for Platinum", () => {
    expect(
      formatContactQuotaUsage({
        planSlug: "platinum",
        limit: null,
        usedThisMonth: 4,
        remaining: null,
      }),
    ).toBe("4 · Unlimited")
  })
})

describe("contactQuotaHint", () => {
  it("tells a Free member they can pay or upgrade", () => {
    expect(
      contactQuotaHint({
        planSlug: "free",
        limit: 3,
        usedThisMonth: 3,
        remaining: 0,
      }),
    ).toBe("You've used all 3 contact unlocks this month. Pay ₹29 for one more, or upgrade.")
  })

  it("tells a Silver member Gold has unlimited contacts", () => {
    expect(
      contactQuotaHint({
        planSlug: "silver",
        limit: 10,
        usedThisMonth: 10,
        remaining: 0,
      }),
    ).toMatch(/Gold for unlimited contacts/)
  })

  it("is undefined when credits remain or the plan is unlimited", () => {
    expect(
      contactQuotaHint({ planSlug: "free", limit: 3, usedThisMonth: 1, remaining: 2 }),
    ).toBeUndefined()
    expect(
      contactQuotaHint({ planSlug: "diamond", limit: null, usedThisMonth: 9, remaining: null }),
    ).toBeUndefined()
  })
})

describe("isContactQuotaError", () => {
  it("matches the API 403 contact message", () => {
    expect(
      isContactQuotaError(
        new ApiError(
          "You have used all 3 contact unlocks this month. Pay ₹29 to unlock this contact or upgrade your plan.",
          403,
        ),
      ),
    ).toBe(true)
  })
})
