import { describe, it, expect } from "vitest"
import { ApiError, isVerificationPendingError } from "./api-client"

describe("isVerificationPendingError", () => {
  it("detects 403 verification gate from ApiError", () => {
    expect(
      isVerificationPendingError(
        new ApiError(
          "Profile verification pending — you can browse, but interactions unlock after admin verification.",
          403,
        ),
      ),
    ).toBe(true)
  })

  it("rejects unrelated errors", () => {
    expect(isVerificationPendingError(new ApiError("Not found", 404))).toBe(false)
    expect(isVerificationPendingError(new Error("Network down"))).toBe(false)
    expect(isVerificationPendingError(null)).toBe(false)
  })
})
