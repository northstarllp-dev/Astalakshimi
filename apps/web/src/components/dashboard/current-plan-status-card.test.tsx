import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { CurrentPlanStatusCard } from "./current-plan-status-card"

const useInterestUsageQuery = vi.fn()
const useContactUsageQuery = vi.fn()
const useSubscriptionQuery = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/hooks/queries", () => ({
  useSubscriptionQuery: (...args: unknown[]) => useSubscriptionQuery(...args),
  useContactUsageQuery: (...args: unknown[]) => useContactUsageQuery(...args),
  useInterestUsageQuery: (...args: unknown[]) => useInterestUsageQuery(...args),
}))

describe("CurrentPlanStatusCard interest usage", () => {
  it("shows remaining Free interests on the home plan card", () => {
    useSubscriptionQuery.mockReturnValue({ data: null })
    useContactUsageQuery.mockReturnValue({
      data: { planSlug: "free", limit: 3, usedThisMonth: 2, remaining: 1, periodLabel: "this month" },
    })
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "free", limit: 30, used: 12, remaining: 18, periodLabel: "this 30 days" },
    })
    render(<CurrentPlanStatusCard />)
    expect(screen.getByText("12 / 30 this 30 days · 18 left")).toBeInTheDocument()
    expect(screen.getByText("2 / 3 this month · 1 left")).toBeInTheDocument()
    expect(screen.queryByText(/Interest quota used up/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Contact unlocks used up/)).not.toBeInTheDocument()
  })

  it("highlights when Gold has used all 500", () => {
    useSubscriptionQuery.mockReturnValue({ data: { planSlug: "gold", expiresAt: new Date("2027-01-01") } })
    useContactUsageQuery.mockReturnValue({ data: { usedThisMonth: 2, limit: 20 } })
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "gold", limit: 500, used: 500, remaining: 0, periodLabel: "this Gold plan" },
    })
    render(<CurrentPlanStatusCard />)
    expect(screen.getByText("500 / 500 this Gold plan · none left")).toBeInTheDocument()
    expect(screen.getByText("Interest quota used up")).toBeInTheDocument()
    expect(screen.getByText(/Platinum for unlimited/)).toBeInTheDocument()
  })

  it("shows unlimited for Platinum", () => {
    useSubscriptionQuery.mockReturnValue({
      data: { planSlug: "platinum", expiresAt: new Date("2027-01-01") },
    })
    useContactUsageQuery.mockReturnValue({ data: { usedThisMonth: 1, limit: null } })
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "platinum", limit: null, used: 40, remaining: null, periodLabel: "unlimited" },
    })
    render(<CurrentPlanStatusCard />)
    expect(screen.getByText("40 · Unlimited")).toBeInTheDocument()
    expect(screen.queryByText(/Interest quota used up/)).not.toBeInTheDocument()
  })
})

describe("CurrentPlanStatusCard contact usage", () => {
  it("highlights when Free has no contact unlocks left", () => {
    useSubscriptionQuery.mockReturnValue({ data: null })
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "free", limit: 30, used: 1, remaining: 29, periodLabel: "this 30 days" },
    })
    useContactUsageQuery.mockReturnValue({
      data: { planSlug: "free", limit: 3, usedThisMonth: 3, remaining: 0, periodLabel: "this month" },
    })
    render(<CurrentPlanStatusCard />)
    expect(screen.getByText("3 / 3 this month · none left")).toBeInTheDocument()
    expect(screen.getByText("Contact unlocks used up")).toBeInTheDocument()
    expect(screen.getByText(/Pay ₹29 for one more/)).toBeInTheDocument()
  })
})
