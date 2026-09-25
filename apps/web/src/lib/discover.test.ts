import { describe, it, expect } from "vitest"
import {
  EMPTY_ADVANCED,
  DEFAULT_DISCOVER,
  DEFAULT_AGE_MIN,
  DEFAULT_AGE_MAX,
  PAID_TABS,
  BROWSE_TABS,
  DISCOVER_VIEWS,
  DEFAULT_VIEW,
  parseDiscoverView,
  toSearchApiParams,
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
  it("DEFAULT_DISCOVER starts with age filter off so search returns all ages", () => {
    expect(DEFAULT_DISCOVER.ageMin).toBe(DEFAULT_AGE_MIN)
    expect(DEFAULT_DISCOVER.ageMax).toBe(DEFAULT_AGE_MAX)
    expect(DEFAULT_DISCOVER.ageFilterEnabled).toBe(false)
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

describe("toSearchApiParams", () => {
  it("omits age when the age filter is inactive", () => {
    const params = toSearchApiParams({ ...DEFAULT_DISCOVER, page: 1, limit: 10 })
    expect(params.ageMin).toBeUndefined()
    expect(params.ageMax).toBeUndefined()
    expect(params.tab).toBe("all")
    expect(params.page).toBe(1)
  })

  it("includes age when the age filter is enabled", () => {
    const params = toSearchApiParams({
      ...DEFAULT_DISCOVER,
      ageFilterEnabled: true,
      ageMin: 25,
      ageMax: 32,
      city: "Chennai",
    })
    expect(params.ageMin).toBe(25)
    expect(params.ageMax).toBe(32)
    expect(params.city).toBe("Chennai")
  })

  it("omits empty city and community", () => {
    const params = toSearchApiParams(DEFAULT_DISCOVER)
    expect(params.city).toBeUndefined()
    expect(params.community).toBeUndefined()
  })

  it("forwards browse tabs including verified and nearby", () => {
    expect(toSearchApiParams({ ...DEFAULT_DISCOVER, tab: "verified" }).tab).toBe("verified")
    expect(toSearchApiParams({ ...DEFAULT_DISCOVER, tab: "nearby" }).tab).toBe("nearby")
    expect(toSearchApiParams({ ...DEFAULT_DISCOVER, tab: "new" }).tab).toBe("new")
  })

  it("includes advanced filters when provided", () => {
    const params = toSearchApiParams({
      ...DEFAULT_DISCOVER,
      advanced: {
        ...EMPTY_ADVANCED,
        heights: ["165-173"],
        diets: ["Vegetarian"],
      },
    })
    expect(params.advanced).toEqual({
      ...EMPTY_ADVANCED,
      heights: ["165-173"],
      diets: ["Vegetarian"],
    })
  })
})

describe("discover sub-tabs", () => {
  it("DEFAULT_VIEW is the matches tab", () => {
    expect(DEFAULT_VIEW).toBe("matches")
  })
  it("DISCOVER_VIEWS exposes the matches and search tabs", () => {
    expect(DISCOVER_VIEWS.map((v) => v.id)).toEqual(["matches", "search"])
    expect(DISCOVER_VIEWS.map((v) => v.label)).toEqual(["For you", "Browse"])
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
