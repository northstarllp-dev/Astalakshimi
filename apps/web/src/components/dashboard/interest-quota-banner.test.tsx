import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { InterestQuotaBanner } from "./interest-quota-banner"

const useInterestUsageQuery = vi.fn()

vi.mock("@/hooks/queries", () => ({
  useInterestUsageQuery: (...args: unknown[]) => useInterestUsageQuery(...args),
}))

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

describe("InterestQuotaBanner", () => {
  it("hides when quota remains", () => {
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "free", limit: 30, used: 4, remaining: 26, periodLabel: "this 30 days" },
    })
    const { container } = render(<InterestQuotaBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it("tells a Free member to upgrade when 30 are used", () => {
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "free", limit: 30, used: 30, remaining: 0, periodLabel: "this 30 days" },
    })
    render(<InterestQuotaBanner />)
    expect(
      screen.getByText("You've used all 30 interests this 30 days. Upgrade to send more."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /upgrade plan/i })).toHaveAttribute("href", "/plans")
  })

  it("tells a Silver member Gold has 500", () => {
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "silver", limit: 100, used: 100, remaining: 0, periodLabel: "this Silver plan" },
    })
    render(<InterestQuotaBanner />)
    expect(screen.getByText(/Gold for 500/)).toBeInTheDocument()
  })

  it("tells a Gold member Platinum is unlimited", () => {
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "gold", limit: 500, used: 500, remaining: 0, periodLabel: "this Gold plan" },
    })
    render(<InterestQuotaBanner />)
    expect(screen.getByText(/Platinum for unlimited/)).toBeInTheDocument()
  })

  it("hides for Platinum unlimited", () => {
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "platinum", limit: null, used: 12, remaining: null, periodLabel: "unlimited" },
    })
    const { container } = render(<InterestQuotaBanner />)
    expect(container).toBeEmptyDOMElement()
  })
})
