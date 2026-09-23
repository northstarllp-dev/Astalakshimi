import type { Database } from '@astalakshimi/database';
import { profiles, partnerPreferences } from '@astalakshimi/database';
import { eq } from 'drizzle-orm';
import { DEFAULT_PREF_AGE_MAX, DEFAULT_PREF_AGE_MIN, type BasicPrefs } from './match-scoring';

export interface ViewerContext {
  profileId: string;
  gender: string | null;
  city: string | null;
  state: string | null;
  prefs: BasicPrefs;
}

/**
 * Shared viewer context for every scoring surface (top matches, profile view,
 * shortlists, search). Unset preferences = open matching (hard filters fall
 * back to age defaults, soft dimensions score nothing). Never fabricate-and-
 * persist here.
 */
export async function loadViewerContext(
  db: Database,
  userId: string,
): Promise<ViewerContext | null> {
  const [viewer] = await db
    .select({
      id: profiles.id,
      gender: profiles.gender,
      city: profiles.city,
      state: profiles.state,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (!viewer) return null;

  const [prefsRow] = await db
    .select()
    .from(partnerPreferences)
    .where(eq(partnerPreferences.profileId, viewer.id))
    .limit(1);

  return {
    profileId: viewer.id,
    gender: viewer.gender,
    city: viewer.city ?? null,
    state: viewer.state ?? null,
    prefs: {
      prefAgeMin: prefsRow?.prefAgeMin ?? null,
      prefAgeMax: prefsRow?.prefAgeMax ?? null,
      prefHeightMinCm: prefsRow?.prefHeightMinCm ?? null,
      prefHeightMaxCm: prefsRow?.prefHeightMaxCm ?? null,
      prefMaritalStatuses: (prefsRow?.prefMaritalStatuses as string[] | null) ?? null,
      prefReligions: (prefsRow?.prefReligions as string[] | null) ?? null,
      prefCastes: (prefsRow?.prefCastes as string[] | null) ?? null,
      prefMotherTongues: (prefsRow?.prefMotherTongues as string[] | null) ?? null,
      prefMinEducation: prefsRow?.prefMinEducation ?? null,
      prefLocations: (prefsRow?.prefLocations as string[] | null) ?? null,
    },
  };
}

/** Trimmed, blank-free list for SQL IN clauses. */
export function cleanList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v).trim()).filter(Boolean);
}

function dobYearsAgo(years: number, ref: Date): string {
  const d = new Date(ref);
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().split('T')[0];
}

/**
 * SQL dob bounds for the age hard filter (same boundary math as the search
 * service): a candidate is `ageMin`+ iff dob <= today - ageMin years, and at
 * most `ageMax` iff dob >= today - (ageMax + 1) years. The Node-side
 * `passesHardFilters` remains the exact authority for boundary days.
 */
export function dobBoundsForAgeWindow(
  prefs: BasicPrefs,
  ref: Date = new Date(),
): { dobUpper: string; dobLower: string } {
  const ageMin = prefs.prefAgeMin ?? DEFAULT_PREF_AGE_MIN;
  const ageMax = prefs.prefAgeMax ?? DEFAULT_PREF_AGE_MAX;
  return {
    dobUpper: dobYearsAgo(ageMin, ref),
    dobLower: dobYearsAgo(ageMax + 1, ref),
  };
}
