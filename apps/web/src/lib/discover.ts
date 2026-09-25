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
  maritalStatuses: string[]
  employmentStatuses: string[]
  familyTypes: string[]
  familyValues: string[]
  familyStatus: string[]
  motherTongues: string[]
  complexions: string[]
  rashis: string[]
}

export type DiscoverQuery = {
  ageMin: number
  ageMax: number
  /** When false, age is UI-only and not sent to the API (show all ages). */
  ageFilterEnabled: boolean
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
  maritalStatuses: [],
  employmentStatuses: [],
  familyTypes: [],
  familyValues: [],
  familyStatus: [],
  motherTongues: [],
  complexions: [],
  rashis: [],
}

/** Slider defaults when the age filter is inactive (not applied to search). */
export const DEFAULT_AGE_MIN = 21
export const DEFAULT_AGE_MAX = 40

export const DEFAULT_DISCOVER: DiscoverQuery = {
  ageMin: DEFAULT_AGE_MIN,
  ageMax: DEFAULT_AGE_MAX,
  ageFilterEnabled: false,
  city: "",
  community: "",
  tab: "all",
  advanced: EMPTY_ADVANCED,
}

/** Build the search API payload — omit unset filters so the API returns the full opposite-gender pool. */
export function toSearchApiParams(query: DiscoverQuery & { page?: number; limit?: number }) {
  const params: Record<string, unknown> = {
    tab: query.tab || "all",
    page: query.page ?? 1,
    limit: query.limit ?? 10,
  }
  if (query.ageFilterEnabled) {
    params.ageMin = query.ageMin
    params.ageMax = query.ageMax
  }
  if (query.city) params.city = query.city
  if (query.community) params.community = query.community
  if (query.advanced) params.advanced = query.advanced
  return params
}

export const PAID_TABS: BrowseTab[] = ["premium", "active"]

export const BROWSE_TABS: { id: BrowseTab; label: string; paid?: boolean }[] = [
  { id: "all", label: "All profiles" },
  { id: "new", label: "New profiles" },
  { id: "nearby", label: "Nearby" },
  { id: "premium", label: "Premium", paid: true },
  { id: "verified", label: "Verified" },
  { id: "active", label: "Recently active", paid: true },
]

/** Top-level Discover sub-tabs: preference-gated For you vs. the full catalog. */
export type DiscoverView = "matches" | "search"

export const DEFAULT_VIEW: DiscoverView = "matches"

export const DISCOVER_VIEWS: { id: DiscoverView; label: string }[] = [
  { id: "matches", label: "For you" },
  { id: "search", label: "Browse" },
]

/** Parse the `?view=` query param, defaulting to the matches tab. */
export function parseDiscoverView(value: string | null | undefined): DiscoverView {
  return value === "search" ? "search" : "matches"
}

