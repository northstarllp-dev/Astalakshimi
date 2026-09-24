import type { Database } from '@astalakshimi/database';
import { profiles, partnerPreferences, subscriptions, plans } from '@astalakshimi/database';
import { and, eq, gt, sql } from 'drizzle-orm';
import { type BasicPrefs } from './match-scoring';

export interface ViewerContext {
  profileId: string;
  gender: string | null;
  city: string | null;
  state: string | null;
  viewerIsPaid: boolean;
  prefs: BasicPrefs;
}

/**
 * Shared viewer context for For you and Browse. Unset required prefs
 * (age / religion / marital) mean For you is empty — never fabricate them here.
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

  const [paidRow] = await db
    .select({ slug: plans.slug })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        gt(subscriptions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return {
    profileId: viewer.id,
    gender: viewer.gender,
    city: viewer.city ?? null,
    state: viewer.state ?? null,
    viewerIsPaid: Boolean(paidRow && paidRow.slug && paidRow.slug !== 'free'),
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
 * SQL dob bounds for the age hard filter: a candidate is `ageMin`+ iff
 * dob <= today - ageMin years, and at most `ageMax` iff dob >= today - (ageMax + 1) years.
 * Returns null when the age window is incomplete.
 */
export function dobBoundsForAgeWindow(
  prefs: BasicPrefs,
  ref: Date = new Date(),
): { dobUpper: string; dobLower: string } | null {
  if (prefs.prefAgeMin == null || prefs.prefAgeMax == null) return null;
  return {
    dobUpper: dobYearsAgo(prefs.prefAgeMin, ref),
    dobLower: dobYearsAgo(prefs.prefAgeMax + 1, ref),
  };
}

/** Hidden (paused) profiles never appear. Premium-only profiles appear to paid viewers only. */
export function visibilitySql(viewerIsPaid: boolean) {
  if (viewerIsPaid) {
    return sql`NOT EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_settings.user_id = ${profiles.userId}
        AND (user_settings.hide_profile = true OR user_settings.profile_visibility = 'hidden')
    )`;
  }
  return sql`NOT EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_settings.user_id = ${profiles.userId}
      AND (
        user_settings.hide_profile = true
        OR user_settings.profile_visibility = 'hidden'
        OR user_settings.profile_visibility = 'premium'
      )
  )`;
}

export function lowerIn(column: any, values: string[]) {
  const cleaned = values.map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (cleaned.length === 0) return sql`false`;
  return sql`lower(${column}::text) in (${sql.join(
    cleaned.map((v) => sql`${v}`),
    sql`, `,
  )})`;
}
