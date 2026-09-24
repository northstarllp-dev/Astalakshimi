import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MatchThumbCard } from "./match-thumb-card"

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

vi.mock("@/components/profile/locked-photo", () => ({
  LockedPhoto: () => <div>Photo hidden</div>,
}))

describe("MatchThumbCard", () => {
  it("does not show a Verified badge even when photoVerified is true", () => {
    render(
      <MatchThumbCard
        match={{
          id: "p1",
          fullName: "E2E Candidate A",
          age: 28,
          matchPercent: 98,
          photoVerified: true,
          isVerified: true,
          photos: ["photos/a.webp"],
        }}
      />,
    )
    expect(screen.queryByText(/98%/)).not.toBeInTheDocument()
    expect(screen.getByText(/E2E Candidate A, 28/)).toBeInTheDocument()
    expect(screen.queryByText(/verified/i)).not.toBeInTheDocument()
  })
})
