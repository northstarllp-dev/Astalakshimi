import { describe, it, expect } from "vitest"
import {
  getPlanById,
  featureCell,
  computeAddonPrice,
  MEMBERSHIP_PLANS,
  PLAN_IDS,
  PLAN_FEATURE_MATRIX,
  EXTRA_CONTACT_FEE,
} from "./plans"

describe("PLAN_IDS / MEMBERSHIP_PLANS", () => {
  it("lists all 5 plan ids", () => {
    expect(PLAN_IDS).toEqual(["free", "silver", "gold", "platinum", "diamond"])
  })
  it("has 5 plans with unique ids", () => {
    expect(MEMBERSHIP_PLANS).toHaveLength(5)
    const ids = MEMBERSHIP_PLANS.map((p) => p.id)
    expect(new Set(ids).size).toBe(5)
  })
  it("free plan has zero price", () => {
    expect(getPlanById("free")?.priceInPaise).toBe(0)
  })
  it("gold is highlighted as most popular", () => {
    expect(getPlanById("gold")?.highlighted).toBe(true)
  })
})

describe("getPlanById", () => {
  it("finds by id (case-insensitive, trimmed)", () => {
    expect(getPlanById(" Gold ")?.id).toBe("gold")
    expect(getPlanById("GOLD")?.id).toBe("gold")
  })
  it("returns null for unknown id", () => {
    expect(getPlanById("ruby")).toBeNull()
  })
  it("returns null for empty", () => {
    expect(getPlanById("")).toBeNull()
  })
})

describe("featureCell", () => {
  it("true -> yes", () => {
    expect(featureCell(true)).toEqual({ type: "yes", label: "Included" })
  })
  it("false -> no", () => {
    expect(featureCell(false)).toEqual({ type: "no", label: "Locked" })
  })
  it("string -> text", () => {
    expect(featureCell("Unlimited")).toEqual({ type: "text", label: "Unlimited" })
  })
})

describe("computeAddonPrice", () => {
  it("multiplies base by multiplier and rounds to paise", () => {
    expect(computeAddonPrice(49900, 1)).toEqual({ paise: 49900, label: "₹499" })
  })
  it("applies multiplier and formats INR", () => {
    const r = computeAddonPrice(49900, 1.8)
    expect(r.paise).toBe(89820)
    expect(r.label).toMatch(/₹/)
  })
})

describe("PLAN_FEATURE_MATRIX", () => {
  it("every feature has values for all 5 plans", () => {
    for (const f of PLAN_FEATURE_MATRIX) {
      expect(f).toHaveProperty("free")
      expect(f).toHaveProperty("silver")
      expect(f).toHaveProperty("gold")
      expect(f).toHaveProperty("platinum")
      expect(f).toHaveProperty("diamond")
    }
  })
  it("extra contact fee is 29 and reflected in matrix", () => {
    expect(EXTRA_CONTACT_FEE).toBe(29)
    const cell = PLAN_FEATURE_MATRIX.find((f) => f.key === "extra_contact")
    expect(cell?.free).toContain("29")
  })
})
