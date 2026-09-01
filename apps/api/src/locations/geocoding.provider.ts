import type { CityAutocompleteResult } from '@astalakshimi/types';

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  suburb?: string;
  county?: string;
  state?: string;
  state_district?: string;
  country?: string;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  address?: NominatimAddress;
};

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'AstalakshimiMatrimony/1.0 (city-autocomplete)';

export function parseNominatimResult(row: NominatimResult): CityAutocompleteResult | null {
  const address = row.address;
  if (!address) return null;

  const name =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.suburb ||
    address.county ||
    row.display_name.split(',')[0]?.trim();

  const state = address.state || address.state_district;
  const country = address.country || 'India';

  if (!name || !state) return null;

  return {
    id: row.place_id,
    name,
    state,
    country,
    label: `${name}, ${state}`,
  };
}

export function dedupeCityResults(rows: CityAutocompleteResult[]): CityAutocompleteResult[] {
  const seen = new Set<string>();
  const merged: CityAutocompleteResult[] = [];

  for (const row of rows) {
    const key = `${row.name.trim().toLowerCase()}|${row.state.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  return merged;
}

export async function searchPlacesWithNominatim(
  query: string,
  limit = 10,
  countryCode = 'in',
): Promise<CityAutocompleteResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    addressdetails: '1',
    limit: String(limit),
    countrycodes: countryCode,
  });

  const response = await fetch(`${NOMINATIM_BASE}?${params.toString()}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as NominatimResult[];
  return dedupeCityResults(
    payload.map(parseNominatimResult).filter((row): row is CityAutocompleteResult => row !== null),
  );
}
