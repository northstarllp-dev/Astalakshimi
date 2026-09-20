export type CatalogEntry = {
  slug: string
  label: string
}

export type CommunityEntry = CatalogEntry & {
  religion: string
  aliases?: string[]
}

export type CityEntry = CatalogEntry & {
  state: string
  country: string
  aliases?: string[]
}

export type CitySearchResult = {
  slug: string
  name: string
  state: string
  country: string
  label: string
}
