import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@localhost:5432/astalakshimi');

async function check() {
  const res = await sql`SELECT * FROM otp_attempts ORDER BY created_at DESC LIMIT 1`;
  console.log('Last OTP Attempt:', res);
  console.log('Current Time:', new Date(), new Date().getTime());
  
  if (res.length > 0) {
     const expiresAt = res[0].expires_at;
     console.log('Expires At:', expiresAt, expiresAt.getTime());
     console.log('Is Expired?:', new Date() > expiresAt);
  }
  process.exit(0);
}
check();
