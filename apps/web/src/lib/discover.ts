import { MATCHES, type MatchProfile } from "@/lib/matches"
import type { SignupData } from "@/lib/profile-store"

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

const RECENT_ACTIVE = ["Online now", "Today", "2 hours ago"]

export function uniqueField(key: keyof MatchProfile) {
  return Array.from(new Set(MATCHES.map((m) => String(m[key])))).filter(Boolean)
}

export function heightBand(height: string) {
  const inches = heightToInches(height)
  if (inches <= 64) return "Up to 5'4\""
  if (inches <= 68) return "5'5\" – 5'8\""
  return "5'9\" & above"
}

export function heightToInches(height: string) {
  const match = height.match(/(\d+)'(\d+)/)
  if (!match) return 0
  return Number(match[1]) * 12 + Number(match[2])
}

export function isRecentlyActive(profile: MatchProfile) {
  return RECENT_ACTIVE.includes(profile.lastActive)
}

export function isNewProfile(profile: MatchProfile) {
  return profile.joinedDaysAgo <= 7
}

function toggleMatch(list: string[], value: string) {
  if (list.length === 0) return true
  return list.includes(value)
}

export function applyDiscover(
  matches: MatchProfile[],
  query: DiscoverQuery,
  skipped: string[],
  userCity?: string
) {
  let result = matches.filter((m) => !skipped.includes(m.id))

  result = result.filter((m) => m.age >= query.ageMin && m.age <= query.ageMax)
  if (query.city) result = result.filter((m) => m.city === query.city)
  if (query.community) result = result.filter((m) => m.community === query.community)

  const adv = query.advanced
  if (adv.heights.length) result = result.filter((m) => adv.heights.includes(heightBand(m.height)))
  if (adv.educations.length)
    result = result.filter((m) =>
      adv.educations.some((e) => m.education.toLowerCase().includes(e.toLowerCase()))
    )
  if (adv.incomes.length) result = result.filter((m) => adv.incomes.includes(m.income))
  if (adv.occupations.length) result = result.filter((m) => adv.occupations.includes(m.occupation))
  if (adv.diets.length) result = result.filter((m) => toggleMatch(adv.diets, m.lifestyle.diet))
  if (adv.smoking.length) result = result.filter((m) => adv.smoking.includes(m.lifestyle.smoking))
  if (adv.drinking.length) result = result.filter((m) => adv.drinking.includes(m.lifestyle.drinking))
  if (adv.manglik.length) result = result.filter((m) => adv.manglik.includes(m.manglik))
  if (adv.stars.length) result = result.filter((m) => adv.stars.includes(m.star))
  if (adv.relocate === "yes") result = result.filter((m) => m.willingToRelocate)
  if (adv.relocate === "no") result = result.filter((m) => !m.willingToRelocate)

  if (query.tab === "new") result = result.filter(isNewProfile)
  if (query.tab === "nearby" && userCity)
    result = result.filter((m) => m.city.toLowerCase() === userCity.toLowerCase())
  if (query.tab === "premium") result = result.filter((m) => m.premium)
  if (query.tab === "verified") result = result.filter((m) => m.verified)
  if (query.tab === "active") result = result.filter(isRecentlyActive)

  return [...result].sort((a, b) => b.matchPercent - a.matchPercent)
}

export function fromPartnerPreferences(profile: SignupData | null): Partial<DiscoverQuery> {
  if (!profile) return {}
  return {
    ageMin: profile.prefAgeMin || DEFAULT_DISCOVER.ageMin,
    ageMax: profile.prefAgeMax || DEFAULT_DISCOVER.ageMax,
    city: profile.city || "",
    community: profile.caste || "",
    tab: "all",
  }
}
