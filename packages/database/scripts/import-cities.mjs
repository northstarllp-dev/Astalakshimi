import * as dotenv from 'dotenv';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../data/india-locations.json');

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeAlias(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1 });

async function importLocations() {
  const payload = JSON.parse(readFileSync(dataPath, 'utf8'));
  const country = payload.country || 'India';

  console.log(`Importing ${payload.states.length} states from ${dataPath}...`);

  await sql.begin(async (tx) => {
    await tx`DELETE FROM city_aliases`;
    await tx`DELETE FROM cities`;
    await tx`DELETE FROM states`;

    for (const state of payload.states) {
      const stateSlug = slugify(`${state.name}-${country}`);
      const [insertedState] = await tx`
        INSERT INTO states (name, country, slug)
        VALUES (${state.name}, ${country}, ${stateSlug})
        RETURNING id
      `;

      for (const city of state.cities) {
        const citySlug = slugify(`${city.name}-${state.name}-${country}`);
        const [insertedCity] = await tx`
          INSERT INTO cities (state_id, name, slug, district)
          VALUES (${insertedState.id}, ${city.name}, ${citySlug}, ${city.district ?? null})
          RETURNING id
        `;

        const aliasSet = new Set();
        const aliases = [city.name, ...(city.aliases || [])];
        for (const alias of aliases) {
          const normalized = normalizeAlias(alias);
          if (!normalized || aliasSet.has(normalized)) continue;
          aliasSet.add(normalized);
          await tx`
            INSERT INTO city_aliases (city_id, alias, normalized_alias)
            VALUES (${insertedCity.id}, ${alias.trim()}, ${normalized})
          `;
        }
      }
    }
  });

  const [{ states: stateCount }] = await sql`SELECT COUNT(*)::int AS states FROM states`;
  const [{ cities: cityCount }] = await sql`SELECT COUNT(*)::int AS cities FROM cities`;
  const [{ aliases: aliasCount }] = await sql`SELECT COUNT(*)::int AS aliases FROM city_aliases`;

  console.log(`Done: ${stateCount} states, ${cityCount} cities, ${aliasCount} aliases`);
}

importLocations()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
