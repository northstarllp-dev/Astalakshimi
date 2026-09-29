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

  it("does not offer pay or plans when the contact is already unlocked", async () => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({ success: true, alreadyUnlocked: true, contactPhone: "9876543210" })
    render(
      <ProfileContactUnlockDialog
        open
        onOpenChange={vi.fn()}
        profileId="p1"
        phone="9876543210"
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
    expect(screen.getByText("Contact unlocked")).toBeInTheDocument()
    expect(screen.getByText("+91 98765 43210")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /call now/i })).toHaveAttribute("href", "tel:9876543210")
    expect(screen.queryByRole("button", { name: /pay ₹29/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /view plans/i })).not.toBeInTheDocument()
  })

  it("loads the phone when unlocked but no number was passed in", async () => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({ success: true, alreadyUnlocked: true, contactPhone: "9123456780" })
    render(
      <ProfileContactUnlockDialog
        open
        onOpenChange={vi.fn()}
        profileId="p1"
        access={access({
          isUnlocked: true,
          canView: true,
          canUnlockWithQuota: false,
          canPayExtra: false,
        })}
      />,
    )
    expect(await screen.findByText("+91 91234 56780")).toBeInTheDocument()
    expect(mutateAsync).toHaveBeenCalledWith("p1")
  })
})
