# @astalakshimi/reference

Cost-minimal **owned catalogs** for definitive profile fields.

## Contents

| File | Tier | Fields | Data origin |
|------|------|--------|-------------|
| `data/religions.json` | A | religion | Curated (no open API) |
| `data/mother-tongues.json` | A | motherTongue | Curated (Census languages) |
| `data/relocate-options.json` | A | willingToRelocate | Curated |
| `data/communities.json` | B | caste by religion | Curated matrimony list — **no trustworthy open caste API** |
| `data/cities.json` | C | city + state | **GeoNames India dump** (one-time offline import) |

`src/generated/catalog-data.ts` is auto-generated for browser + Node (no live network at runtime).

## Online / open datasets — what we use

### Cities — yes, download once

Open source: [GeoNames](https://www.geonames.org/export/) country dump for India.

```bash
# Downloads IN.zip + admin1 codes, filters places (default min population 5000),
# writes packages/database/data/india-locations.json, regenerates catalogs.
node packages/reference/scripts/import-geonames-cities.mjs
node packages/reference/scripts/import-geonames-cities.mjs --min-pop 10000   # fewer/larger cities
```

- **Not** called from the form at runtime (no Nominatim / GeoNames API on the request path).
- Cached under `packages/reference/.cache/geonames/` (gitignored).
- Previous hand seed backed up as `india-locations.pre-geonames.json`.

### Caste / community — no good open download

There is **no** reliable open government/API dataset of castes/communities for self-declared matrimony profiles. Name→caste inference APIs are wrong for this product.

We keep a **curated** `community-master.json` → `communities.json`. Grow it by editing that seed and running `pnpm generate`. Subcaste/gotra stay free text (not catalogued).

### Religion / mother tongue — curated small lists

Tiny closed sets; no need for external dumps.

## Commands

```bash
pnpm --filter @astalakshimi/reference generate   # rebuild from seeds
pnpm --filter @astalakshimi/reference build
```

## Explicitly not doing

- Live Nominatim / Places / GeoNames HTTP on forms
- Cataloging subcaste / gotra
- Matching algorithm (deferred)
