import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const dataPath = path.resolve(__dirname, '../data/education-master.json');
const master = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function normalizeAlias(value) {
  return value
    .toLowerCase()
    .replace(/[.\s/_-]+/g, '')
    .trim();
}

const sql = postgres(dbUrl);

try {
  const levelIdByName = new Map();

  for (let i = 0; i < master.levels.length; i++) {
    const level = master.levels[i];
    const [row] = await sql`
      INSERT INTO education_levels (name, display_order)
      VALUES (${level.name}, ${i + 1})
      ON CONFLICT (name) DO UPDATE SET display_order = EXCLUDED.display_order
      RETURNING id, name
    `;
    levelIdByName.set(level.name, row.id);

    const aliases = new Set([level.name, ...(level.aliases || [])]);
    for (const alias of aliases) {
      const normalizedAlias = normalizeAlias(alias);
      if (!normalizedAlias) continue;
      await sql`
        INSERT INTO education_aliases (education_id, alias, normalized_alias)
        VALUES (${row.id}, ${alias}, ${normalizedAlias})
        ON CONFLICT (education_id, normalized_alias) DO NOTHING
      `;
    }
  }

  let specCount = 0;
  for (const [levelName, specs] of Object.entries(master.specializations)) {
    const educationId = levelIdByName.get(levelName);
    if (!educationId || !Array.isArray(specs)) continue;

    for (let i = 0; i < specs.length; i++) {
      await sql`
        INSERT INTO specializations (education_id, name, display_order)
        VALUES (${educationId}, ${specs[i]}, ${i + 1})
        ON CONFLICT (education_id, name) DO NOTHING
      `;
      specCount++;
    }
  }

  const backfill = await sql`
    UPDATE profiles p
    SET education_id = el.id
    FROM education_levels el
    LEFT JOIN education_aliases ea ON ea.education_id = el.id
    WHERE p.education_id IS NULL
      AND (
        lower(trim(p.degree)) = lower(trim(el.name))
        OR lower(trim(p.degree)) = lower(trim(ea.alias))
        OR ea.normalized_alias = regexp_replace(lower(trim(p.degree)), '[.\\s/_-]+', '', 'g')
      )
  `;

  console.log(`Seeded ${master.levels.length} education levels, ${specCount} specializations.`);
  console.log(`Backfilled education_id on ${backfill.count ?? 0} profiles.`);
} catch (err) {
  console.error('Failed to import education master:', err);
  process.exit(1);
} finally {
  await sql.end();
}
