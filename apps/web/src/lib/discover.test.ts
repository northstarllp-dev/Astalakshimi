import { describe, it, expect } from "vitest"
import {
  EMPTY_ADVANCED,
  DEFAULT_DISCOVER,
  PAID_TABS,
  BROWSE_TABS,
  DISCOVER_VIEWS,
  DEFAULT_VIEW,
  parseDiscoverView,
} from "./discover"

describe("discover constants", () => {
  it("EMPTY_ADVANCED has all filter arrays empty and relocate blank", () => {
    expect(EMPTY_ADVANCED.heights).toEqual([])
    expect(EMPTY_ADVANCED.educations).toEqual([])
    expect(EMPTY_ADVANCED.incomes).toEqual([])
    expect(EMPTY_ADVANCED.occupations).toEqual([])
    expect(EMPTY_ADVANCED.diets).toEqual([])
    expect(EMPTY_ADVANCED.smoking).toEqual([])
    expect(EMPTY_ADVANCED.drinking).toEqual([])
    expect(EMPTY_ADVANCED.manglik).toEqual([])
    expect(EMPTY_ADVANCED.stars).toEqual([])
    expect(EMPTY_ADVANCED.relocate).toBe("")
  })
  it("DEFAULT_DISCOVER has sensible defaults", () => {
    expect(DEFAULT_DISCOVER.ageMin).toBe(21)
    expect(DEFAULT_DISCOVER.ageMax).toBe(40)
    expect(DEFAULT_DISCOVER.tab).toBe("all")
    expect(DEFAULT_DISCOVER.advanced).toEqual(EMPTY_ADVANCED)
  })
  it("PAID_TABS are premium and active", () => {
    expect(PAID_TABS).toEqual(["premium", "active"])
  })
  it("BROWSE_TABS marks paid tabs", () => {
    const paid = BROWSE_TABS.filter((t) => t.paid).map((t) => t.id)
    expect(paid).toEqual(["premium", "active"])
  })
  it("BROWSE_TABS includes all expected tabs", () => {
    const ids = BROWSE_TABS.map((t) => t.id)
    expect(ids).toEqual(["all", "new", "nearby", "premium", "verified", "active"])
  })
})

describe("discover sub-tabs", () => {
  it("DEFAULT_VIEW is the matches tab", () => {
    expect(DEFAULT_VIEW).toBe("matches")
  })
  it("DISCOVER_VIEWS exposes the matches and search tabs", () => {
    expect(DISCOVER_VIEWS.map((v) => v.id)).toEqual(["matches", "search"])
    expect(DISCOVER_VIEWS.map((v) => v.label)).toEqual(["Your Top Matches", "Search & Filter"])
  })
  it("parseDiscoverView reads the search tab from the query param", () => {
    expect(parseDiscoverView("search")).toBe("search")
    expect(parseDiscoverView("matches")).toBe("matches")
  })
  it("parseDiscoverView defaults to matches for missing or unknown values", () => {
    expect(parseDiscoverView(null)).toBe("matches")
    expect(parseDiscoverView(undefined)).toBe("matches")
    expect(parseDiscoverView("")).toBe("matches")
    expect(parseDiscoverView("nonsense")).toBe("matches")
  })
})
