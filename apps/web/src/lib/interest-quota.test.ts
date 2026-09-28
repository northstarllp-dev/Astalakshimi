import { describe, it, expect } from "vitest"
import { ApiError } from "@/lib/api-client"
import {
  formatInterestQuotaUsage,
  interestQuotaHint,
  isInterestQuotaError,
  isInterestQuotaExhausted,
} from "./interest-quota"

describe("isInterestQuotaExhausted", () => {
  it("is true when Free has used all 30", () => {
    expect(
      isInterestQuotaExhausted({
        planSlug: "free",
        limit: 30,
        used: 30,
        remaining: 0,
        periodLabel: "this 30 days",
      }),
    ).toBe(true)
  })

  it("is true when Silver has used all 100", () => {
    expect(
      isInterestQuotaExhausted({
        planSlug: "silver",
        limit: 100,
        used: 100,
        remaining: 0,
        periodLabel: "this Silver plan",
      }),
    ).toBe(true)
  })

  it("is true when Gold has used all 500", () => {
    expect(
      isInterestQuotaExhausted({
        planSlug: "gold",
        limit: 500,
        used: 500,
        remaining: 0,
        periodLabel: "this Gold plan",
      }),
    ).toBe(true)
  })

  it("is false for Platinum unlimited", () => {
    expect(
      isInterestQuotaExhausted({
        planSlug: "platinum",
        limit: null,
        used: 0,
        remaining: null,
        periodLabel: "unlimited",
      }),
    ).toBe(false)
  })

  it("is false for Diamond unlimited even with many sends", () => {
    expect(
      isInterestQuotaExhausted({
        planSlug: "diamond",
        limit: null,
        used: 1200,
        remaining: null,
        periodLabel: "unlimited",
      }),
    ).toBe(false)
  })

  it("is false when a slot remains", () => {
    expect(
      isInterestQuotaExhausted({
        planSlug: "free",
        limit: 30,
        used: 29,
        remaining: 1,
        periodLabel: "this 30 days",
      }),
    ).toBe(false)
  })
})

describe("interestQuotaHint", () => {
  it("tells a Free member to upgrade", () => {
    expect(
      interestQuotaHint({
        planSlug: "free",
        limit: 30,
        used: 30,
        remaining: 0,
        periodLabel: "this 30 days",
      }),
    ).toBe("You've used all 30 interests this 30 days. Upgrade to send more.")
  })

  it("tells a Silver member Gold has 500", () => {
    expect(
      interestQuotaHint({
        planSlug: "silver",
        limit: 100,
        used: 100,
        remaining: 0,
        periodLabel: "this Silver plan",
      }),
    ).toMatch(/Gold for 500/)
  })

  it("tells a Gold member Platinum is unlimited", () => {
    expect(
      interestQuotaHint({
        planSlug: "gold",
        limit: 500,
        used: 500,
        remaining: 0,
        periodLabel: "this Gold plan",
      }),
    ).toMatch(/Platinum for unlimited/)
  })

  it("is undefined when quota remains", () => {
    expect(
      interestQuotaHint({ planSlug: "free", limit: 30, used: 1, remaining: 29 }),
    ).toBeUndefined()
  })
})

describe("formatInterestQuotaUsage", () => {
  it("shows remaining for a Free cycle", () => {
    expect(
      formatInterestQuotaUsage({
        planSlug: "free",
        limit: 30,
        used: 12,
        remaining: 18,
        periodLabel: "this 30 days",
      }),
    ).toBe("12 / 30 this 30 days · 18 left")
  })

  it("shows none left when Silver is at the cap", () => {
    expect(
      formatInterestQuotaUsage({
        planSlug: "silver",
        limit: 100,
        used: 100,
        remaining: 0,
        periodLabel: "this Silver plan",
      }),
    ).toBe("100 / 100 this Silver plan · none left")
  })

  it("shows unlimited for Platinum", () => {
    expect(
      formatInterestQuotaUsage({
        planSlug: "platinum",
        limit: null,
        used: 40,
        remaining: null,
        periodLabel: "unlimited",
      }),
    ).toBe("40 · Unlimited")
  })
})

describe("isInterestQuotaError", () => {
  it("matches the API 403 quota message", () => {
    expect(
      isInterestQuotaError(
        new ApiError(
          "You have reached your interest quota limit of 30 for this 30 days. Upgrade your plan to send more interests.",
          403,
        ),
      ),
    ).toBe(true)
  })

  it("ignores other 403s", () => {
    expect(isInterestQuotaError(new ApiError("Cannot send interest to this profile.", 403))).toBe(
      false,
    )
  })
})
