import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProfileContactUnlockDialog, type ContactAccessState } from "./profile-contact-unlock-dialog"

const mutateAsync = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock("@/hooks/queries", () => ({
  useUnlockContactMutation: () => ({ mutateAsync, isPending: false }),
  usePayExtraContactUnlockMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

function access(overrides: Partial<ContactAccessState>): ContactAccessState {
  return {
    canView: false,
    isUnlocked: false,
    isMutualBenefit: true,
    limit: 3,
    usedThisMonth: 0,
    remaining: 3,
    canUnlockWithQuota: true,
    canPayExtra: false,
    extraContactFeePaise: 2900,
    planSlug: "free",
    ...overrides,
  }
}

describe("ProfileContactUnlockDialog", () => {
  it("does not call unlock when the monthly quota is used up", async () => {
    mutateAsync.mockReset()
    render(
      <ProfileContactUnlockDialog
        open
        onOpenChange={vi.fn()}
        profileId="p1"
        access={access({
          usedThisMonth: 3,
          remaining: 0,
          canUnlockWithQuota: false,
          canPayExtra: true,
        })}
      />,
    )
    expect(screen.getByRole("button", { name: /pay ₹29 to unlock/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute("href", "/plans")
    expect(screen.queryByRole("button", { name: /use 4\/3 credit/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /pay ₹29 to unlock/i }))
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it("does not offer pay or plans when the contact is already unlocked", () => {
    render(
      <ProfileContactUnlockDialog
        open
        onOpenChange={vi.fn()}
        profileId="p1"
        access={access({
          isUnlocked: true,
          canView: true,
          usedThisMonth: 3,
          remaining: 0,
          canUnlockWithQuota: false,
          canPayExtra: true,
        })}
      />,
    )
    expect(screen.getByText("This contact is already unlocked.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /pay ₹29/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /view plans/i })).not.toBeInTheDocument()
  })
})
