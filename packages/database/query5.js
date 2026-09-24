const { eq, and, ne, inArray, gte, lte, or, desc, sql, gt, lt, between } = require('drizzle-orm');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const { profiles, userSettings } = require('./dist/schema/index.js');
const client = postgres('postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require');
const db = drizzle(client);

async function run() {
  try {
    const userId = "1"; // Just mock a userId to exclude

    function visibilitySql(viewerIsPaid) {
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

    const conditions = [
      inArray(profiles.gender, ['Male']),
      visibilitySql(true),
      between(profiles.heightCm, 165, 173)
    ];

    const query = db.select().from(profiles).where(and(...conditions)).toSQL();
    console.log("SQL:", query.sql);
    console.log("Params:", query.params);

    const result = await db.select().from(profiles).where(and(...conditions));
    console.log("Found:", result.length);
    console.log("Profiles:", result.map(p => ({ id: p.id, gender: p.gender, heightCm: p.heightCm })));
  } catch(e) {
    console.error(e);
  } finally {
    client.end();
  }
}
run();
