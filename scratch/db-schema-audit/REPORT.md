# Schema audit report

Generated: 2026-09-11T14:00:19.476Z (counts refreshed same session)

## Verdict

**Schema is aligned.** Live RDS matches Drizzle models 1:1 for all 37 tables and all columns. API health is OK. Raw SQL in the API only references columns/tables that exist.

The earlier `profiles.created_by` failure was fixed by applying `0006_strong_morbius.sql`.

## Summary

| Check | Result |
|-------|--------|
| Live tables | 37 |
| Drizzle tables | 37 |
| Tables missing in DB | 0 |
| Tables missing in code | 0 |
| Columns missing in DB | 0 |
| Columns missing in code | 0 |
| Drizzle migrations recorded | 8 |
| API schema imports | 38 |
| Raw `sql` snippets reviewed | 19 |
| API `/health` | ok / database healthy |

## Master / reference data (exact counts)

| Table | Rows |
|-------|------|
| states | 25 |
| cities | 104 |
| city_aliases | 154 |
| education_levels | 47 |
| specializations | 199 |
| education_aliases | 117 |
| occupations | 91 |
| occupation_aliases | 219 |
| companies | 150 |
| company_aliases | 220 |
| communities | 130 |
| community_aliases | 285 |
| gotras | 49 |
| gotra_aliases | 85 |
| subcastes | 209 |
| subcaste_aliases | 209 |
| plans | 5 (Free, Silver, Gold, Platinum, Diamond) |

## App data (exact counts)

| Table | Rows | Notes |
|-------|------|-------|
| users | 2 | OTP users exist |
| profiles | 0 | No completed registration yet |
| profile_photos | 0 | |
| otp_attempts | 16 | |
| payments / subscriptions / interests / shortlists / notifications | 0 | empty as expected |

## SQL smoke tests (direct against RDS)

| Query | Result |
|-------|--------|
| cities `Chen%` | 1 hit |
| communities `Brah%` | 1 hit |
| education_levels `B.%` | 5 hits |
| `profiles.created_by` group by | column exists (0 rows) |

## API notes

- Public master-data routes (`/locations/*`, `/educations/*`, `/careers/*`, `/communities/*`, `/plans`) return **401** without auth — expected; they are behind the auth guard.
- All 19 raw SQL fragments in API services reference known tables/columns (`profiles`, `profile_photos`, `cities`, `states`, aliases, `otp_attempts`, etc.).

## Artifacts

- `scratch/db-schema-audit/live-schema.sql` — human-readable schema dump
- `scratch/db-schema-audit/live-schema.json` — full columns, constraints, indexes
- `scratch/db-schema-audit/schema-diff-report.json` — machine-readable diff + API scan
- `scratch/db-schema-audit/table-counts.json` — row counts + smoke results
- Re-run: `node packages/database/scripts/audit-schema.mjs`
- Counts: `node packages/database/scripts/count-tables.mjs`

## Testing tip

You currently have **2 users and 0 profiles** (registration likely failed before `created_by` was applied). Retry complete-registration while logged in, or register a fresh phone number.
