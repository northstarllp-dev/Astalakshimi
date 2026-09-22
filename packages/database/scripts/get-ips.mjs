import postgres from 'postgres';
const sql = postgres('postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require', { max: 1 });

async function main() {
  try {
    const clients = await sql`SELECT DISTINCT client_addr FROM pg_stat_activity WHERE client_addr IS NOT NULL`;
    console.log("Connected IP addresses:");
    clients.forEach(c => console.log(c.client_addr));
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
main();
