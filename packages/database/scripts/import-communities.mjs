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

const dataPath = path.resolve(__dirname, '../data/community-master.json');
const master = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeAlias(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

const sql = postgres(dbUrl, { max: 1 });

async function importCommunities() {
  let aliasCount = 0;
  let subcasteCount = 0;
  let gotraCount = 0;

  for (const community of master.communities) {
    const slug = slugify(`${community.religion}-${community.name}`);
    const [row] = await sql`
      INSERT INTO communities (religion, name, slug)
      VALUES (${community.religion}, ${community.name}, ${slug})
      ON CONFLICT (religion, name) DO UPDATE SET slug = EXCLUDED.slug
      RETURNING id
    `;

    const aliasSet = new Set();
    for (const alias of [community.name, ...(community.aliases || [])]) {
      const normalized = normalizeAlias(alias);
      if (!normalized || aliasSet.has(normalized)) continue;
      aliasSet.add(normalized);
      await sql`
        INSERT INTO community_aliases (community_id, alias, normalized_alias)
        VALUES (${row.id}, ${alias.trim()}, ${normalized})
        ON CONFLICT (community_id, normalized_alias) DO NOTHING
      `;
      aliasCount++;
    }

    for (const subcaste of community.subcastes || []) {
      const [subRow] = await sql`
        INSERT INTO subcastes (community_id, name)
        VALUES (${row.id}, ${subcaste})
        ON CONFLICT (community_id, name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;
      subcasteCount++;

      const subAliasSet = new Set();
      for (const alias of [subcaste]) {
        const normalized = normalizeAlias(alias);
        if (!normalized || subAliasSet.has(normalized)) continue;
        subAliasSet.add(normalized);
        await sql`
          INSERT INTO subcaste_aliases (subcaste_id, alias, normalized_alias)
          VALUES (${subRow.id}, ${alias.trim()}, ${normalized})
          ON CONFLICT (subcaste_id, normalized_alias) DO NOTHING
        `;
        aliasCount++;
      }
    }
  }

  const gotraByName = new Map();
  for (const gotra of master.gotras || []) {
    const key = gotra.name.trim().toLowerCase();
    const existing = gotraByName.get(key);
    if (existing) {
      existing.aliases.push(...(gotra.aliases || []));
      if (!existing.religion && gotra.religion) existing.religion = gotra.religion;
      continue;
    }
    gotraByName.set(key, {
      name: gotra.name,
      religion: gotra.religion ?? null,
      aliases: [...(gotra.aliases || [])],
    });
  }

  for (const gotra of gotraByName.values()) {
    const slug = slugify(gotra.religion ? `${gotra.religion}-${gotra.name}` : gotra.name);
    const [row] = await sql`
      INSERT INTO gotras (religion, name, slug)
      VALUES (${gotra.religion}, ${gotra.name}, ${slug})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    gotraCount++;

    const aliasSet = new Set();
    for (const alias of [gotra.name, ...gotra.aliases]) {
      const normalized = normalizeAlias(alias);
      if (!normalized || aliasSet.has(normalized)) continue;
      aliasSet.add(normalized);
      await sql`
        INSERT INTO gotra_aliases (gotra_id, alias, normalized_alias)
        VALUES (${row.id}, ${alias.trim()}, ${normalized})
        ON CONFLICT (gotra_id, normalized_alias) DO NOTHING
      `;
      aliasCount++;
    }
  }

  const [{ communities }] = await sql`SELECT count(*)::int AS communities FROM communities`;
  const [{ subcastes }] = await sql`SELECT count(*)::int AS subcastes FROM subcastes`;
  const [{ gotras }] = await sql`SELECT count(*)::int AS gotras FROM gotras`;

  console.log(
    `Done: ${communities} communities, ${subcastes} subcastes, ${gotras} gotras, ${aliasCount} aliases`,
  );
}

importCommunities()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
