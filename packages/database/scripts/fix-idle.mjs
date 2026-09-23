import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
sql`UPDATE verifications SET status = 'pending' WHERE status = 'idle'`.then(() => {
  console.log('Updated to pending');
  process.exit(0);
}).catch(console.error);
