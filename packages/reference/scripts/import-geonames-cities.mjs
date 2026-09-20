#!/usr/bin/env node
/**
 * One-time offline import of India cities from GeoNames open dumps.
 *
 * Downloads (not used at runtime):
 *   - https://download.geonames.org/export/dump/IN.zip
 *   - https://download.geonames.org/export/dump/admin1CodesASCII.txt
 *
 * Writes packages/database/data/india-locations.json then regenerates
 * @astalakshimi/reference catalogs.
 *
 * Usage:
 *   node packages/reference/scripts/import-geonames-cities.mjs
 *   node packages/reference/scripts/import-geonames-cities.mjs --min-pop 5000
 */
import fs from 'fs'
import path from 'path'
import https from 'https'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { createUnzip } from 'zlib'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { execFileSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../../..')
const cacheDir = path.join(root, 'packages/reference/.cache/geonames')
const locationsOut = path.join(root, 'packages/database/data/india-locations.json')

const MIN_POP = (() => {
  const idx = process.argv.indexOf('--min-pop')
  if (idx >= 0 && process.argv[idx + 1]) return Number(process.argv[idx + 1]) || 5000
  return 5000
})()

const PLACE_CODES = new Set([
  'PPL',
  'PPLA',
  'PPLA2',
  'PPLA3',
  'PPLA4',
  'PPLC',
  'PPLG',
  'PPLS',
  'PPLX',
])

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`cache hit ${path.basename(dest)}`)
      resolve(dest)
      return
    }
    console.log(`downloading ${url}`)
    const file = createWriteStream(dest)
    https
      .get(url, { headers: { 'User-Agent': 'AstalakshimiCatalogImporter/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close()
          fs.unlinkSync(dest)
          download(res.headers.location, dest).then(resolve).catch(reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          return
        }
        res.pipe(file)
        file.on('finish', () => file.close(() => resolve(dest)))
      })
      .on('error', (err) => {
        try {
          fs.unlinkSync(dest)
        } catch {}
        reject(err)
      })
  })
}

async function unzipInTxt(zipPath, outTxt) {
  // Prefer PowerShell Expand-Archive / tar if available; fallback to reading via unzip CLI.
  const extractDir = path.join(cacheDir, 'extract')
  fs.mkdirSync(extractDir, { recursive: true })
  try {
    execFileSync('tar', ['-xf', zipPath, '-C', extractDir], { stdio: 'pipe' })
  } catch {
    try {
      execFileSync(
        'powershell',
        ['-NoProfile', '-Command', `Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${extractDir}'`],
        { stdio: 'pipe' },
      )
    } catch (err) {
      throw new Error(`Failed to unzip ${zipPath}: ${err}`)
    }
  }
  const candidate = path.join(extractDir, 'IN.txt')
  if (!fs.existsSync(candidate)) {
    throw new Error('IN.txt not found after unzip')
  }
  fs.copyFileSync(candidate, outTxt)
  return outTxt
}

function loadAdmin1Names(admin1Path) {
  const map = new Map()
  for (const line of fs.readFileSync(admin1Path, 'utf8').split(/\r?\n/)) {
    if (!line) continue
    const [code, name] = line.split('\t')
    if (!code?.startsWith('IN.')) continue
    const adminCode = code.slice(3) // e.g. "25"
    map.set(adminCode, name)
  }
  return map
}

function buildLocations(inTxtPath, admin1Map) {
  /** @type {Map<string, Map<string, { name: string, aliases: string[], population: number }>>} */
  const byState = new Map()

  for (const line of fs.readFileSync(inTxtPath, 'utf8').split(/\r?\n/)) {
    if (!line) continue
    const cols = line.split('\t')
    const name = cols[1]
    const ascii = cols[2]
    const aliasesRaw = cols[3] || ''
    const featureCode = cols[7]
    const country = cols[8]
    const admin1 = cols[10]
    const population = Number(cols[14] || 0)

    if (country !== 'IN') continue
    if (!PLACE_CODES.has(featureCode)) continue
    if (!name) continue
    if (population < MIN_POP) continue

    const stateName = admin1Map.get(admin1) || admin1 || 'Unknown'
    if (stateName === 'Unknown' || /^\d+$/.test(stateName)) continue

    const label = (ascii || name).trim()
    if (!label) continue

    if (!byState.has(stateName)) byState.set(stateName, new Map())
    const cities = byState.get(stateName)
    const existing = cities.get(label.toLowerCase())
    const aliases = aliasesRaw
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a && a.toLowerCase() !== label.toLowerCase())
      .slice(0, 10)

    if (!existing || population > existing.population) {
      cities.set(label.toLowerCase(), {
        name: label,
        aliases,
        population,
      })
    }
  }

  const states = Array.from(byState.entries())
    .map(([name, cities]) => ({
      name,
      cities: Array.from(cities.values())
        .sort((a, b) => b.population - a.population || a.name.localeCompare(b.name))
        .map(({ name: cityName, aliases }) => ({
          name: cityName,
          aliases: aliases.slice(0, 6),
        })),
    }))
    .filter((s) => s.cities.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    country: 'India',
    source: 'GeoNames IN dump (offline one-time import)',
    minPopulation: MIN_POP,
    generatedAt: new Date().toISOString(),
    states,
  }
}

async function main() {
  fs.mkdirSync(cacheDir, { recursive: true })
  const zipPath = path.join(cacheDir, 'IN.zip')
  const admin1Path = path.join(cacheDir, 'admin1CodesASCII.txt')
  const inTxtPath = path.join(cacheDir, 'IN.txt')

  await download('https://download.geonames.org/export/dump/IN.zip', zipPath)
  await download(
    'https://download.geonames.org/export/dump/admin1CodesASCII.txt',
    admin1Path,
  )
  await unzipInTxt(zipPath, inTxtPath)

  const admin1Map = loadAdmin1Names(admin1Path)
  const payload = buildLocations(inTxtPath, admin1Map)
  const cityCount = payload.states.reduce((n, s) => n + s.cities.length, 0)

  // Keep a backup of the previous curated seed.
  if (fs.existsSync(locationsOut)) {
    const bak = locationsOut.replace(/\.json$/, `.pre-geonames.json`)
    if (!fs.existsSync(bak)) fs.copyFileSync(locationsOut, bak)
  }

  fs.writeFileSync(locationsOut, JSON.stringify(payload, null, 2) + '\n')
  console.log(
    `wrote ${locationsOut}: ${payload.states.length} states, ${cityCount} cities (min pop ${MIN_POP})`,
  )

  const gen = spawnSync(process.execPath, [path.join(__dirname, 'generate-catalogs.mjs')], {
    stdio: 'inherit',
  })
  if (gen.status !== 0) process.exit(gen.status || 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
