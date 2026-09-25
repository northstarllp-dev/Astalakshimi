import postgres from 'postgres';
import { randomUUID } from 'crypto';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require';
const sql = postgres(connectionString);

const occupations = [
  "Software Engineer",
  "Doctor",
  "Engineer - Non IT",
  "Teacher / Professor",
  "Business Owner",
  "Banker / Finance",
  "Government Service",
  "Defense",
  "Lawyer",
  "Other"
];

async function main() {
  await sql.begin(async (tx) => {
    let i = 100;
    for (const occ of occupations) {
      i++;
      const phone = `9000100${i}`;
      
      const userId = randomUUID();
      await tx`
        INSERT INTO users (
          id, phone, role, status, is_phone_verified, consent_accepted, consent_timestamp
        ) VALUES (
          ${userId}::uuid, ${phone}, 'member', 'active', true, true, NOW()
        )
      `;

      await tx`
        INSERT INTO user_settings (user_id)
        VALUES (${userId}::uuid)
      `;

      const profileId = randomUUID();
      await tx`
        INSERT INTO profiles (
          id, user_id, created_by, profile_for, full_name, gender, dob, marital_status,
          height_cm, city, state, country, religion, caste, mother_tongue,
          education_level, degree, employment_status, profession, company_sector,
          annual_income, photo_privacy, about_me, required_complete
        ) VALUES (
          ${profileId}::uuid, ${userId}::uuid, 'self', 'Myself', ${occ + ' Man'}, 'Male', '1995-01-01', 'Never Married',
          175, 'Chennai', 'Tamil Nadu', 'India', 'Hindu', 'Iyer', 'Tamil',
          'Bachelors', 'B.E.', 'Employed', ${occ},
          'Private', '10-12 Lakh', 'blurred',
          'I am a ' || ${occ}, true
        )
      `;

      await tx`
        INSERT INTO profile_photos (
          id, profile_id, s3_key, is_primary
        ) VALUES (
          ${randomUUID()}::uuid, ${profileId}::uuid, 'dummy_photo_' || ${i} || '.jpg', true
        )
      `;
      
      // also seed family_details etc to make sure they show up
      await tx`
        INSERT INTO family_details (profile_id, family_values, family_type, brothers_count, sisters_count)
        VALUES (${profileId}::uuid, 'Moderate', 'Nuclear', 0, 0)
      `;
      await tx`
        INSERT INTO lifestyle_interests (profile_id, diet, smoking, alcohol, interests)
        VALUES (${profileId}::uuid, 'Vegetarian', 'Never', 'Never', '[]'::jsonb)
      `;
      await tx`
        INSERT INTO horoscopes (profile_id, manglik, rashi, nakshatra)
        VALUES (${profileId}::uuid, 'No', 'Mesha', 'Ashwini')
      `;
      await tx`
        INSERT INTO partner_preferences (
          profile_id, pref_age_min, pref_age_max,
          pref_marital_statuses, pref_religions, pref_castes, pref_mother_tongues,
          pref_acceptable_incomes, pref_locations
        ) VALUES (
          ${profileId}::uuid, 22, 30,
          ${JSON.stringify(['Never Married'])}::jsonb,
          ${JSON.stringify(['Hindu'])}::jsonb,
          ${JSON.stringify(['Iyer'])}::jsonb,
          ${JSON.stringify(['Tamil'])}::jsonb,
          '[]'::jsonb,
          ${JSON.stringify(['Chennai'])}::jsonb
        )
      `;
      
      console.log(`Inserted ${occ}`);
    }
  });
  
  await sql.end();
}

main().catch(console.error);
