export type BrowseTab =
  | "all"
  | "new"
  | "nearby"
  | "premium"
  | "verified"
  | "active"

export type AdvancedFilters = {
  heights: string[]
  educations: string[]
  incomes: string[]
  occupations: string[]
  diets: string[]
  smoking: string[]
  drinking: string[]
  manglik: string[]
  stars: string[]
  relocate: "" | "yes" | "no"
}

export type DiscoverQuery = {
  ageMin: number
  ageMax: number
  city: string
  community: string
  tab: BrowseTab
  advanced: AdvancedFilters
}

export const EMPTY_ADVANCED: AdvancedFilters = {
  heights: [],
  educations: [],
  incomes: [],
  occupations: [],
  diets: [],
  smoking: [],
  drinking: [],
  manglik: [],
  stars: [],
  relocate: "",
}

export const DEFAULT_DISCOVER: DiscoverQuery = {
  ageMin: 21,
  ageMax: 40,
  city: "",
  community: "",
  tab: "all",
  advanced: EMPTY_ADVANCED,
}

export const PAID_TABS: BrowseTab[] = ["premium", "active"]

export const BROWSE_TABS: { id: BrowseTab; label: string; paid?: boolean }[] = [
  { id: "all", label: "All matches" },
  { id: "new", label: "New profiles" },
  { id: "nearby", label: "Nearby" },
  { id: "premium", label: "Premium", paid: true },
  { id: "verified", label: "Verified" },
  { id: "active", label: "Recently active", paid: true },
]

/** Top-level Discover sub-tabs: score-ranked matches vs. manual search/filter. */
export type DiscoverView = "matches" | "search"

export const DEFAULT_VIEW: DiscoverView = "matches"

export const DISCOVER_VIEWS: { id: DiscoverView; label: string }[] = [
  { id: "matches", label: "Your Top Matches" },
  { id: "search", label: "Search & Filter" },
]

/** Parse the `?view=` query param, defaulting to the matches tab. */
export function parseDiscoverView(value: string | null | undefined): DiscoverView {
  return value === "search" ? "search" : "matches"
}

