import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const sql = postgres(process.env.DATABASE_URL as string);

  try {
    const res = await sql`
      UPDATE profiles
      SET 
        profession = NULL,
        "company_sector" = NULL,
        "annual_income" = NULL,
        "education_level" = NULL,
        degree = NULL,
        "employment_status" = NULL
      WHERE 
        profession = 'Software Engineer' 
        AND "company_sector" = 'Private' 
        AND "annual_income" = '₹10 – 15 Lakh';
    `;
    console.log(`Updated ${res.count} profiles.`);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
