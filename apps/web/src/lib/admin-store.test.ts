import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getAdminStats } from "./admin-store"
import { MEMBERSHIP_PLANS } from "./plans"
import type { AdminProfile } from "./admin-store"

describe("Admin Store - Revenue Calculation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-01T00:00:00Z")) // During launch offer
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const baseProfile: AdminProfile = {
    id: "prof-1",
    userId: "user-1",
    fullName: "Test User",
    age: 25,
    gender: "Male",
    location: "Chennai",
    caste: "Test Caste",
    submittedAt: "2026-09-20T00:00:00Z", // During launch offer
    verificationStatus: "verified",
    verificationMethod: "govt_id",
    completeness: 100,
    activeSubscription: true,
    plan: "Silver",
    photos: [],
    reviewedAt: "2026-09-20T00:00:00Z",
  }

  it("should not add revenue for Silver plan bought during launch offer", () => {
    const silverPlan = MEMBERSHIP_PLANS.find(p => p.id === "silver")!
    
    const profile: AdminProfile = {
      ...baseProfile,
      plan: "Silver",
      planExpiry: new Date(
        new Date("2026-09-20T00:00:00Z").getTime() + silverPlan.durationDays * 24 * 60 * 60 * 1000
      ).toISOString(), // Bought on 2026-09-20 (during launch offer)
    }

    const stats = getAdminStats([profile])
    expect(stats.totalRevenue).toBe(0)
  })

  it("should add revenue for Gold plan bought during launch offer", () => {
    const goldPlan = MEMBERSHIP_PLANS.find(p => p.id === "gold")!
    
    const profile: AdminProfile = {
      ...baseProfile,
      plan: "Gold",
      planExpiry: new Date(
        new Date("2026-09-20T00:00:00Z").getTime() + goldPlan.durationDays * 24 * 60 * 60 * 1000
      ).toISOString(), // Bought on 2026-09-20 (during launch offer)
    }

    const stats = getAdminStats([profile])
    expect(stats.totalRevenue).toBe(Math.round(goldPlan.priceInPaise / 100))
  })

  it("should add revenue for Silver plan bought after launch offer expiry", () => {
    const silverPlan = MEMBERSHIP_PLANS.find(p => p.id === "silver")!
    
    const profile: AdminProfile = {
      ...baseProfile,
      plan: "Silver",
      planExpiry: new Date(
        new Date("2027-01-01T00:00:00Z").getTime() + silverPlan.durationDays * 24 * 60 * 60 * 1000
      ).toISOString(), // Bought on 2027-01-01 (after launch offer)
    }

    const stats = getAdminStats([profile])
    expect(stats.totalRevenue).toBe(Math.round(silverPlan.priceInPaise / 100))
  })

  it("should add revenue for any plan bought after launch offer expiry", () => {
    const platinumPlan = MEMBERSHIP_PLANS.find(p => p.id === "platinum")!
    
    const profile: AdminProfile = {
      ...baseProfile,
      plan: "Platinum",
      planExpiry: new Date(
        new Date("2027-01-01T00:00:00Z").getTime() + platinumPlan.durationDays * 24 * 60 * 60 * 1000
      ).toISOString(), // Bought on 2027-01-01 (after launch offer)
    }

    const stats = getAdminStats([profile])
    expect(stats.totalRevenue).toBe(Math.round(platinumPlan.priceInPaise / 100))
  })
})
