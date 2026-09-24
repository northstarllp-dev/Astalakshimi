import type { CatalogEntry, CityEntry, CitySearchResult, CommunityEntry } from './types'
import {
  CITIES,
  COMMUNITIES,
  MOTHER_TONGUES,
  RELIGIONS,
  RELOCATE_OPTIONS,
} from './generated/catalog-data'

export function normalizeCatalogText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function slugifyCatalog(...parts: string[]): string {
  return parts
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getReligions(): CatalogEntry[] {
  return RELIGIONS
}

export function getMotherTongues(): CatalogEntry[] {
  return MOTHER_TONGUES
}

export function getRelocateOptions(): CatalogEntry[] {
  return RELOCATE_OPTIONS
}

export function getCommunities(): CommunityEntry[] {
  return COMMUNITIES
}

export function getCities(): CityEntry[] {
  return CITIES
}

export function getReligionLabels(): string[] {
  return RELIGIONS.map((r) => r.label)
}

export function getMotherTongueLabels(): string[] {
  return MOTHER_TONGUES.map((t) => t.label)
}

export function getRelocateLabels(): string[] {
  return RELOCATE_OPTIONS.map((r) => r.label)
}

export function findReligionBySlug(slug: string): CatalogEntry | undefined {
  const normalized = slug.trim().toLowerCase()
  return RELIGIONS.find((r) => r.slug === normalized)
}

export function findReligionByLabel(label: string): CatalogEntry | undefined {
  const normalized = label.trim().toLowerCase()
  return RELIGIONS.find((r) => r.label.toLowerCase() === normalized)
}

export function isValidReligion(labelOrSlug: string): boolean {
  return Boolean(findReligionByLabel(labelOrSlug) || findReligionBySlug(labelOrSlug))
}

export function findMotherTongueByLabel(label: string): CatalogEntry | undefined {
  const normalized = label.trim().toLowerCase()
  return MOTHER_TONGUES.find((t) => t.label.toLowerCase() === normalized)
}

export function isValidMotherTongue(labelOrSlug: string): boolean {
  const normalized = labelOrSlug.trim().toLowerCase()
  return MOTHER_TONGUES.some(
    (t) => t.label.toLowerCase() === normalized || t.slug === normalized,
  )
}

export function findCommunityBySlug(slug: string): CommunityEntry | undefined {
  const normalized = slug.trim().toLowerCase()
  return COMMUNITIES.find((c) => c.slug === normalized)
}

export function findCommunityByLabel(
  label: string,
  religion?: string,
): CommunityEntry | undefined {
  const normalized = label.trim().toLowerCase()
  const religionNorm = religion?.trim().toLowerCase()
  const matches = COMMUNITIES.filter((c) => c.label.toLowerCase() === normalized)
  if (!religionNorm) return matches[0]
  return (
    matches.find((c) => c.religion.toLowerCase() === religionNorm) ||
    matches.find((c) => c.religion === 'Other')
  )
}

/** Labels that mean "any community" — they are not a caste to match against. */
const OPEN_COMMUNITY_LABELS = new Set([
  'caste no bar',
  'inter-caste',
  'intercaste',
  'inter caste',
  'no caste',
])

export function isOpenCommunityPreference(
  values: readonly string[] | null | undefined,
): boolean {
  if (!values || values.length === 0) return true
  return values.some((value) => OPEN_COMMUNITY_LABELS.has(value.trim().toLowerCase()))
}

export function getCommunitiesForReligion(religion: string): CommunityEntry[] {
  if (!religion) return []
  const religionNorm = religion.toLowerCase()
  return COMMUNITIES.filter(
    (c) => c.religion.toLowerCase() === religionNorm || c.religion === 'Other',
  )
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function getCommunityLabelsForReligion(religion: string): string[] {
  return getCommunitiesForReligion(religion).map((c) => c.label)
}

export function findCityBySlug(slug: string): CityEntry | undefined {
  const normalized = slug.trim().toLowerCase()
  return CITIES.find((c) => c.slug === normalized)
}

export function findCityByNameState(name: string, state?: string): CityEntry | undefined {
  const nameNorm = name.trim().toLowerCase()
  const stateNorm = state?.trim().toLowerCase()
  return CITIES.find((c) => {
    if (c.label.toLowerCase() !== nameNorm) return false
    if (stateNorm && c.state.toLowerCase() !== stateNorm) return false
    return true
  })
}

export function searchCities(
  query: string,
  options?: { state?: string; limit?: number },
): CitySearchResult[] {
  const trimmed = query.trim()
  const normalized = normalizeCatalogText(trimmed)
  if (normalized.length < 2) return []

  const limit = options?.limit ?? 10
  const stateFilter = options?.state?.trim().toLowerCase()
  const scored: Array<{ score: number; city: CityEntry }> = []

  for (const city of CITIES) {
    if (stateFilter && city.state.toLowerCase() !== stateFilter) continue

    const nameNorm = normalizeCatalogText(city.label)
    const stateNorm = normalizeCatalogText(city.state)
    const aliasNorms = (city.aliases || []).map(normalizeCatalogText)
    const nameTokens = nameNorm.split(/\s+/).filter(Boolean)

    let score = -1
    if (nameNorm === normalized) score = 0
    else if (aliasNorms.includes(normalized)) score = 1
    else if (nameNorm.startsWith(normalized)) score = 2
    else if (nameTokens.some((t) => t.startsWith(normalized))) score = 3
    else if (aliasNorms.some((a) => a.startsWith(normalized))) score = 4
    else if (normalized.length >= 4 && nameNorm.includes(` ${normalized}`)) score = 5
    else if (normalized.length >= 4 && aliasNorms.some((a) => a.includes(` ${normalized}`))) {
      score = 6
    } else if (normalized.length >= 5 && stateNorm.startsWith(normalized)) score = 7

    if (score >= 0) scored.push({ score, city })
  }

  scored.sort((a, b) => a.score - b.score || a.city.label.localeCompare(b.city.label))

  return scored.slice(0, limit).map(({ city }) => ({
    slug: city.slug,
    name: city.label,
    state: city.state,
    country: city.country,
    label: `${city.label}, ${city.state}`,
  }))
}

export function listStates(): Array<{ name: string; country: string }> {
  const map = new Map<string, string>()
  for (const city of CITIES) {
    if (!map.has(city.state)) map.set(city.state, city.country)
  }
  return Array.from(map.entries())
    .map(([name, country]) => ({ name, country }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
