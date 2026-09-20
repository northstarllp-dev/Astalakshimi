import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { CompletenessRing } from "./completeness-ring"

describe("CompletenessRing", () => {
  it("renders a progressbar with the percentage", () => {
    render(<CompletenessRing percentage={42} />)
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "42")
    expect(bar).toHaveAttribute("aria-valuemin", "0")
    expect(bar).toHaveAttribute("aria-valuemax", "100")
  })
  it("shows the label when provided", () => {
    render(<CompletenessRing percentage={42} label="Profile strength" />)
    expect(screen.getByText("42%")).toBeInTheDocument()
    expect(screen.getByText("Profile strength")).toBeInTheDocument()
  })
  it("clamps display of 0 and 100", () => {
    const { rerender } = render(<CompletenessRing percentage={0} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
    rerender(<CompletenessRing percentage={100} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
  })
})
