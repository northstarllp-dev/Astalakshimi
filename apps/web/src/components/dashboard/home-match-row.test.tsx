import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { HomeMatchRow } from "./home-match-row"

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img alt={props.alt ?? ""} />
  },
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("@/hooks/queries", () => ({
  useSendInterestMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useShortlistQuery: () => ({ data: [] }),
  useToggleShortlistMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock("@/components/profile/plan-crown-badge", () => ({
  PlanCrownBadge: () => null,
}))

vi.mock("@/components/profile/locked-photo", () => ({
  LockedPhoto: () => <div>Photo hidden</div>,
}))

function renderRow(match: Record<string, unknown>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <HomeMatchRow match={match} />
    </QueryClientProvider>,
  )
}

describe("HomeMatchRow", () => {
  it("does not show a Verified badge even when isVerified / photoVerified are true", () => {
    renderRow({
      id: "p1",
      fullName: "E2E Candidate A",
      age: 28,
      matchPercent: 98,
      isVerified: true,
      photoVerified: true,
      photos: ["photos/a.webp"],
      city: "Chennai",
    })
    expect(screen.getByText("E2E Candidate A")).toBeInTheDocument()
    expect(screen.queryByText(/^Verified$/)).not.toBeInTheDocument()
  })
})
