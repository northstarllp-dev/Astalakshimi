import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProfileGallery } from "./profile-gallery"

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img alt={props.alt ?? ""} />
  },
}))

vi.mock("@/components/profile/plan-crown-badge", () => ({
  PlanCrownBadge: () => null,
}))

vi.mock("@/components/profile/locked-photo", () => ({
  LockedPhoto: ({ label }: { label?: string }) => <div>{label}</div>,
}))

describe("ProfileGallery", () => {
  const base = {
    name: "Priya",
    age: 28,
    city: "Chennai",
    state: "Tamil Nadu",
    lastActive: "Recently",
    photos: ["photos/priya.webp"],
  }

  it("does not render Photo verified or Profile screened badges", () => {
    render(<ProfileGallery {...base} hasHoroscope={false} />)
    expect(screen.queryByText(/photo verified/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/profile screened/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^verified$/i)).not.toBeInTheDocument()
  })

  it("still shows the Horoscope badge when present", () => {
    render(<ProfileGallery {...base} hasHoroscope />)
    expect(screen.getByRole("button", { name: /horoscope/i })).toBeInTheDocument()
  })
})
