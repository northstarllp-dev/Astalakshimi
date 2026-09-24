const { eq, and, ne, inArray, gte, lte, or, desc, sql, gt, lt, between } = require('drizzle-orm');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const { profiles } = require('./dist/schema/index.js'); // Assuming schema is built
const client = postgres('postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require');
const db = drizzle(client);

async function run() {
  try {
    const adv = { heights: ["165-173"] };
    const conditions = [];

    if (adv.heights && adv.heights.length > 0) {
      const heightConditions = adv.heights.map((h) => {
        if (h === "0-164" || h.startsWith("Up to 5'4") || h.startsWith("Up to 164")) return lt(profiles.heightCm, 165);
        if (h === "165-173" || h.startsWith("5'5") || h.startsWith("165 cm")) return between(profiles.heightCm, 165, 173);
        if (h === "174-300" || h.startsWith("5'9") || h.startsWith("174 cm")) return gt(profiles.heightCm, 173);
        const n = parseInt(h, 10);
        if (Number.isFinite(n) && !h.includes("-")) return eq(profiles.heightCm, n);
        return null;
      }).filter(Boolean);
      
      if (heightConditions.length > 0) {
        conditions.push(or(...heightConditions));
      }
    }

    const query = db.select().from(profiles).where(and(...conditions)).toSQL();
    console.log("SQL:", query.sql);
    console.log("Params:", query.params);

    const result = await db.select().from(profiles).where(and(...conditions));
    console.log("Found:", result.length);
  } catch(e) {
    console.error(e);
  } finally {
    client.end();
  }
}
run();
