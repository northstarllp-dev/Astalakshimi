#!/usr/bin/env node
/**
 * Phase 3 helper: expand cities catalog from GeoNames IN.zip (one-time download).
 *
 * Usage:
 *   1. Download https://download.geonames.org/export/dump/IN.zip
 *   2. Unzip to get IN.txt
 *   3. node packages/reference/scripts/expand-cities-from-geonames.mjs path/to/IN.txt
 *
 * This merges into packages/database/data/india-locations.json style output
 * then re-runs generate-catalogs.mjs. Does NOT call GeoNames at runtime.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../../..')
const input = process.argv[2]

if (!input || !fs.existsSync(input)) {
  console.error('Usage: node expand-cities-from-geonames.mjs <path-to-IN.txt>')
  console.error('Download: https://download.geonames.org/export/dump/IN.zip')
  process.exit(1)
}

// GeoNames feature classes for populated places
const PLACE_CODES = new Set(['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLC', 'PPLG', 'PPLS'])

const byState = new Map()
const lines = fs.readFileSync(input, 'utf8').split(/\r?\n/)
for (const line of lines) {
  if (!line) continue
  const cols = line.split('\t')
  // geonameid, name, asciiname, alternatenames, lat, lon, feature class, feature code, country, ..., admin1, ...
  const name = cols[1]
  const ascii = cols[2]
  const aliasesRaw = cols[3] || ''
  const featureCode = cols[7]
  const country = cols[8]
  const admin1 = cols[10] // state code — map later if needed; for now use admin name if present
  if (country !== 'IN') continue
  if (!PLACE_CODES.has(featureCode)) continue
  if (!name) continue

  // Prefer asciiname for stable Latin labels
  const label = ascii || name
  const state = admin1 || 'Unknown'
  if (!byState.has(state)) byState.set(state, new Map())
  const cities = byState.get(state)
  if (!cities.has(label)) {
    const aliases = aliasesRaw
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a && a.toLowerCase() !== label.toLowerCase())
      .slice(0, 8)
    cities.set(label, { name: label, aliases })
  }
}

// Note: GeoNames admin1 is a code (e.g. "25"); for production you'd map codes → names.
// This script writes a staging file for manual review / merge.
const staging = {
  country: 'India',
  note: 'Staging from GeoNames — map admin1 codes to state names before replacing india-locations.json',
  states: Array.from(byState.entries()).map(([name, cities]) => ({
    name,
    cities: Array.from(cities.values()),
  })),
}

const outPath = path.join(root, 'packages/database/data/india-locations.geonames-staging.json')
fs.writeFileSync(outPath, JSON.stringify(staging, null, 2) + '\n')
console.log(`wrote ${outPath} (${staging.states.reduce((n, s) => n + s.cities.length, 0)} cities)`)
console.log('Review + map state codes, merge into india-locations.json, then: pnpm --filter @astalakshimi/reference generate')

spawnSync(process.execPath, [path.join(__dirname, 'generate-catalogs.mjs')], {
  stdio: 'inherit',
})
