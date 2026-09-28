import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ContactQuotaBanner } from "./contact-quota-banner"

const useContactUsageQuery = vi.fn()

vi.mock("@/hooks/queries", () => ({
  useContactUsageQuery: (...args: unknown[]) => useContactUsageQuery(...args),
}))

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

describe("ContactQuotaBanner", () => {
  it("hides when a credit remains", () => {
    useContactUsageQuery.mockReturnValue({
      data: { planSlug: "free", limit: 3, usedThisMonth: 1, remaining: 2, periodLabel: "this month" },
    })
    const { container } = render(<ContactQuotaBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it("tells a Free member to pay or upgrade", () => {
    useContactUsageQuery.mockReturnValue({
      data: { planSlug: "free", limit: 3, usedThisMonth: 3, remaining: 0, periodLabel: "this month" },
    })
    render(<ContactQuotaBanner />)
    expect(screen.getByText(/Pay ₹29 for one more/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /upgrade plan/i })).toHaveAttribute("href", "/plans")
  })

  it("tells a Silver member Gold has unlimited contacts", () => {
    useContactUsageQuery.mockReturnValue({
      data: { planSlug: "silver", limit: 10, usedThisMonth: 10, remaining: 0, periodLabel: "this month" },
    })
    render(<ContactQuotaBanner />)
    expect(screen.getByText(/Gold for unlimited contacts/)).toBeInTheDocument()
  })

  it("hides for Gold unlimited", () => {
    useContactUsageQuery.mockReturnValue({
      data: { planSlug: "gold", limit: null, usedThisMonth: 8, remaining: null, periodLabel: "this month" },
    })
    const { container } = render(<ContactQuotaBanner />)
    expect(container).toBeEmptyDOMElement()
  })
})
