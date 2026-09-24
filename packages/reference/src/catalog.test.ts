import { describe, it, expect } from "vitest"
import {
  normalizeCatalogText,
  slugifyCatalog,
  getReligions,
  getMotherTongues,
  getRelocateOptions,
  getCommunities,
  getCities,
  getReligionLabels,
  findReligionBySlug,
  findReligionByLabel,
  isValidReligion,
  findMotherTongueByLabel,
  isValidMotherTongue,
  findCommunityBySlug,
  findCommunityByLabel,
  getCommunitiesForReligion,
  getCommunityLabelsForReligion,
  findCityBySlug,
  findCityByNameState,
  searchCities,
  listStates,
} from "./catalog"

describe("normalizeCatalogText", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeCatalogText("Café")).toBe("cafe")
    expect(normalizeCatalogText("Nāgari")).toBe("nagari")
  })
  it("collapses non-alphanumeric to spaces", () => {
    expect(normalizeCatalogText("New Delhi")).toBe("new delhi")
    expect(normalizeCatalogText("a-b_c")).toBe("a b c")
  })
  it("trims", () => {
    expect(normalizeCatalogText("  hi  ")).toBe("hi")
  })
})

describe("slugifyCatalog", () => {
  it("joins parts and slugifies", () => {
    expect(slugifyCatalog("Mumbai", "City")).toBe("mumbai-city")
  })
  it("handles diacritics and punctuation", () => {
    expect(slugifyCatalog("Café Bar!")).toBe("cafe-bar")
  })
})

describe("religion catalog", () => {
  it("returns non-empty religion list", () => {
    expect(getReligions().length).toBeGreaterThan(0)
  })
  it("labels match slug lookup", () => {
    const first = getReligions()[0]
    expect(findReligionByLabel(first.label)?.slug).toBe(first.slug)
    expect(findReligionBySlug(first.slug)?.label).toBe(first.label)
  })
  it("isValidReligion accepts label or slug", () => {
    const first = getReligions()[0]
    expect(isValidReligion(first.label)).toBe(true)
    expect(isValidReligion(first.slug)).toBe(true)
    expect(isValidReligion("not-a-religion")).toBe(false)
  })
  it("getReligionLabels matches getReligions length", () => {
    expect(getReligionLabels().length).toBe(getReligions().length)
  })
})

describe("mother tongue catalog", () => {
  it("returns non-empty list", () => {
    expect(getMotherTongues().length).toBeGreaterThan(0)
  })
  it("finds by label", () => {
    const first = getMotherTongues()[0]
    expect(findMotherTongueByLabel(first.label)?.slug).toBe(first.slug)
  })
  it("isValidMotherTongue accepts label or slug", () => {
    const first = getMotherTongues()[0]
    expect(isValidMotherTongue(first.label)).toBe(true)
    expect(isValidMotherTongue(first.slug)).toBe(true)
    expect(isValidMotherTongue("klingon")).toBe(false)
  })
})

describe("relocate options", () => {
  it("returns non-empty list", () => {
    expect(getRelocateOptions().length).toBeGreaterThan(0)
  })
})

describe("community catalog", () => {
  it("returns non-empty list", () => {
    expect(getCommunities().length).toBeGreaterThan(0)
  })
  it("finds by slug", () => {
    const first = getCommunities()[0]
    expect(findCommunityBySlug(first.slug)?.label).toBe(first.label)
  })
  it("finds by label, optionally scoped by religion", () => {
    const first = getCommunities()[0]
    expect(findCommunityByLabel(first.label)?.slug).toBe(first.slug)
    expect(findCommunityByLabel(first.label, first.religion)?.slug).toBe(first.slug)
    expect(findCommunityByLabel(first.label, "definitely-not-a-religion")).toBeUndefined()
  })
  it("resolves Caste no bar for any religion", () => {
    expect(findCommunityByLabel("Caste no bar", "Hindu")?.slug).toBe("other-caste-no-bar")
    expect(findCommunityByLabel("Caste no bar", "Muslim")?.slug).toBe("other-caste-no-bar")
  })
  it("getCommunitiesForReligion filters by religion", () => {
    const first = getCommunities()[0]
    const forReligion = getCommunitiesForReligion(first.religion)
    expect(forReligion.length).toBeGreaterThan(0)
    for (const c of forReligion) {
      expect([c.religion.toLowerCase(), "other"]).toContain(c.religion.toLowerCase())
    }
  })
  it("getCommunitiesForReligion returns [] for empty religion", () => {
    expect(getCommunitiesForReligion("")).toEqual([])
  })
  it("getCommunityLabelsForReligion matches communities length", () => {
    const first = getCommunities()[0]
    const labels = getCommunityLabelsForReligion(first.religion)
    expect(labels.length).toBe(getCommunitiesForReligion(first.religion).length)
  })
})

describe("city catalog", () => {
  it("has thousands of cities", () => {
    expect(getCities().length).toBeGreaterThan(1000)
  })
  it("finds by slug", () => {
    const first = getCities()[0]
    expect(findCityBySlug(first.slug)?.label).toBe(first.label)
  })
  it("finds by name and optional state", () => {
    const first = getCities()[0]
    expect(findCityByNameState(first.label)?.slug).toBe(first.slug)
    expect(findCityByNameState(first.label, first.state)?.slug).toBe(first.slug)
    expect(findCityByNameState(first.label, "no-such-state")).toBeUndefined()
  })
})

describe("searchCities", () => {
  it("returns [] for short queries (<2 chars)", () => {
    expect(searchCities("")).toEqual([])
    expect(searchCities("a")).toEqual([])
  })
  it("exact name match scores best", () => {
    const first = getCities()[0]
    const results = searchCities(first.label)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].slug).toBe(first.slug)
  })
  it("respects limit option", () => {
    expect(searchCities("a", { limit: 3 }).length).toBeLessThanOrEqual(3)
  })
  it("filters by state", () => {
    const first = getCities()[0]
    const results = searchCities(first.label, { state: first.state })
    for (const r of results) {
      expect(r.state.toLowerCase()).toBe(first.state.toLowerCase())
    }
  })
  it("does NOT mid-string match short queries (Singampunari vs pune)", () => {
    // 'pune' should not match inside 'Singampunari' for short queries
    const singampunari = getCities().find((c) => c.label.toLowerCase().includes("singampunari"))
    if (singampunari) {
      const results = searchCities("pune")
      const slugs = results.map((r) => r.slug)
      expect(slugs).not.toContain(singampunari.slug)
    }
  })
  it("returns label as 'name, state'", () => {
    const first = getCities()[0]
    const results = searchCities(first.label)
    expect(results[0].label).toBe(`${first.label}, ${first.state}`)
  })
})

describe("listStates", () => {
  it("returns unique states sorted", () => {
    const states = listStates()
    expect(states.length).toBeGreaterThan(0)
    const names = states.map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
    // verify sorted
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
  })
})
