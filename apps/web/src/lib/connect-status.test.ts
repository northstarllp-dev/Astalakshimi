import { describe, it, expect } from "vitest"
import { getConnectStatus, type InterestsSummary } from "./connect-status"

const base: InterestsSummary = {
  sent: [],
  received: [],
  mutual: [],
}

describe("getConnectStatus", () => {
  it("returns 'connect' when no interests exist", () => {
    expect(getConnectStatus("p1", null)).toBe("connect")
    expect(getConnectStatus("p1", base)).toBe("connect")
  expect(getConnectStatus("p1", undefined)).toBe("connect")
  })

  it("returns 'sent' when a pending sent interest exists", () => {
    expect(
      getConnectStatus("p1", { ...base, sent: [{ profileId: "p1", status: "pending" }] }),
    ).toBe("sent")
  })

  it("returns 'sent' via justSent option even without a sent item", () => {
    expect(getConnectStatus("p1", base, { justSent: true })).toBe("sent")
  })

  it("returns 'accept' when a pending received interest exists", () => {
    expect(
      getConnectStatus("p1", { ...base, received: [{ profileId: "p1", status: "pending" }] }),
    ).toBe("accept")
  })

  it("returns 'mutual' when a mutual interest exists", () => {
    expect(
      getConnectStatus("p1", { ...base, mutual: [{ profileId: "p1" }] }),
    ).toBe("mutual")
  })

  it("returns 'mutual' when sent interest is accepted", () => {
    expect(
      getConnectStatus("p1", { ...base, sent: [{ profileId: "p1", status: "accepted" }] }),
    ).toBe("mutual")
  })

  it("returns 'mutual' when received interest is accepted", () => {
    expect(
      getConnectStatus("p1", { ...base, received: [{ profileId: "p1", status: "accepted" }] }),
    ).toBe("mutual")
  })

  it("matches via nested profile.id", () => {
    expect(
      getConnectStatus("p1", { ...base, sent: [{ profile: { id: "p1" }, status: "pending" }] }),
    ).toBe("sent")
  })

  it("ignores interests for other profiles", () => {
    expect(
      getConnectStatus("p1", { ...base, sent: [{ profileId: "p2", status: "pending" }] }),
    ).toBe("connect")
  })
})
