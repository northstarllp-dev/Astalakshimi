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

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/[.\s/_&-]+/g, '')
    .trim();
}

const occupationData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../data/occupation-master.json'), 'utf8'),
);
const companyData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../data/company-master.json'), 'utf8'),
);

const sql = postgres(dbUrl);

try {
  const occupationIdByName = new Map();

  for (let i = 0; i < occupationData.occupations.length; i++) {
    const item = occupationData.occupations[i];
    const [row] = await sql`
      INSERT INTO occupations (name, category, display_order)
      VALUES (${item.name}, ${item.category ?? null}, ${i + 1})
      ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, display_order = EXCLUDED.display_order
      RETURNING id, name
    `;
    occupationIdByName.set(item.name, row.id);

    const aliases = new Set([item.name, ...(item.aliases || [])]);
    for (const alias of aliases) {
      const normalizedAlias = normalize(alias);
      if (!normalizedAlias) continue;
      await sql`
        INSERT INTO occupation_aliases (occupation_id, alias, normalized_alias)
        VALUES (${row.id}, ${alias}, ${normalizedAlias})
        ON CONFLICT (occupation_id, normalized_alias) DO NOTHING
      `;
    }
  }

  let companyCount = 0;
  for (let i = 0; i < companyData.companies.length; i++) {
    const item = companyData.companies[i];
    const [row] = await sql`
      INSERT INTO companies (name, sector, display_order)
      VALUES (${item.name}, ${item.sector ?? null}, ${i + 1})
      ON CONFLICT (name) DO UPDATE SET sector = EXCLUDED.sector, display_order = EXCLUDED.display_order
      RETURNING id, name
    `;
    companyCount++;

    const aliases = new Set([item.name, ...(item.aliases || [])]);
    for (const alias of aliases) {
      const normalizedAlias = normalize(alias);
      if (!normalizedAlias) continue;
      await sql`
        INSERT INTO company_aliases (company_id, alias, normalized_alias)
        VALUES (${row.id}, ${alias}, ${normalizedAlias})
        ON CONFLICT (company_id, normalized_alias) DO NOTHING
      `;
    }
  }

  const backfillOccupation = await sql`
    UPDATE profiles p
    SET occupation_id = o.id
    FROM occupations o
    LEFT JOIN occupation_aliases oa ON oa.occupation_id = o.id
    WHERE p.occupation_id IS NULL
      AND p.profession IS NOT NULL
      AND (
        lower(trim(p.profession)) = lower(trim(o.name))
        OR lower(trim(p.profession)) = lower(trim(oa.alias))
        OR oa.normalized_alias = regexp_replace(lower(trim(p.profession)), '[.\\s/_&-]+', '', 'g')
      )
  `;

  const backfillCompany = await sql`
    UPDATE profiles p
    SET company_id = c.id
    FROM companies c
    LEFT JOIN company_aliases ca ON ca.company_id = c.id
    WHERE p.company_id IS NULL
      AND p.company_name IS NOT NULL
      AND (
        lower(trim(p.company_name)) = lower(trim(c.name))
        OR lower(trim(p.company_name)) = lower(trim(ca.alias))
        OR ca.normalized_alias = regexp_replace(lower(trim(p.company_name)), '[.\\s/_&-]+', '', 'g')
      )
  `;

  console.log(`Seeded ${occupationData.occupations.length} occupations and ${companyCount} companies.`);
  console.log(`Backfilled occupation_id on ${backfillOccupation.count ?? 0} profiles.`);
  console.log(`Backfilled company_id on ${backfillCompany.count ?? 0} profiles.`);
} catch (err) {
  console.error('Failed to import career master:', err);
  process.exit(1);
} finally {
  await sql.end();
}
