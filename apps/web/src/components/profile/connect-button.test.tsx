import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ConnectButton } from "./connect-button"

const mutate = vi.fn()
const push = vi.fn()
const useInterestUsageQuery = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/hooks/queries", () => ({
  useInterestsQuery: () => ({ data: { sent: [], received: [], mutual: [] } }),
  useInterestUsageQuery: (...args: unknown[]) => useInterestUsageQuery(...args),
  useSendInterestMutation: () => ({ mutate, isPending: false }),
}))

describe("ConnectButton interest quota", () => {
  beforeEach(() => {
    mutate.mockReset()
    push.mockReset()
  })

  it("sends when Free still has remaining interests", async () => {
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "free", limit: 30, used: 12, remaining: 18, periodLabel: "this 30 days" },
    })
    render(<ConnectButton profileId="p1" />)
    await userEvent.click(screen.getByRole("button", { name: /connect/i }))
    expect(mutate).toHaveBeenCalledWith("p1")
    expect(push).not.toHaveBeenCalled()
  })

  it("routes Free members to plans when the 30-interest cap is used", async () => {
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "free", limit: 30, used: 30, remaining: 0, periodLabel: "this 30 days" },
    })
    render(<ConnectButton profileId="p1" />)
    const button = screen.getByRole("button", { name: /upgrade to send/i })
    expect(button).toHaveAttribute(
      "title",
      "You've used all 30 interests this 30 days. Upgrade to send more.",
    )
    await userEvent.click(button)
    expect(mutate).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith("/plans")
  })

  it("routes Silver members to plans at 100 interests", async () => {
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "silver", limit: 100, used: 100, remaining: 0, periodLabel: "this Silver plan" },
    })
    render(<ConnectButton profileId="p1" />)
    await userEvent.click(screen.getByRole("button", { name: /upgrade to send/i }))
    expect(mutate).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith("/plans")
  })

  it("routes Gold members to plans at 500 interests", async () => {
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "gold", limit: 500, used: 500, remaining: 0, periodLabel: "this Gold plan" },
    })
    render(<ConnectButton profileId="p1" />)
    expect(screen.getByRole("button", { name: /upgrade to send/i })).toHaveAttribute(
      "title",
      expect.stringContaining("Platinum for unlimited"),
    )
    await userEvent.click(screen.getByRole("button", { name: /upgrade to send/i }))
    expect(mutate).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith("/plans")
  })

  it("keeps Connect enabled for Platinum unlimited", async () => {
    useInterestUsageQuery.mockReturnValue({
      data: { planSlug: "platinum", limit: null, used: 800, remaining: null, periodLabel: "unlimited" },
    })
    render(<ConnectButton profileId="p1" />)
    await userEvent.click(screen.getByRole("button", { name: /^connect$/i }))
    expect(mutate).toHaveBeenCalledWith("p1")
    expect(push).not.toHaveBeenCalled()
  })
})
