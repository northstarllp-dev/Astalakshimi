/**
 * Backfill 10 demo member profiles with the full FK graph:
 *   users -> profiles -> family_details / lifestyle_interests /
 *                        horoscopes / partner_preferences / verifications
 *   users -> user_settings
 *
 * Idempotent on phone: re-running updates the same 10 demo phones.
 * Usage: node packages/database/scripts/seed-demo-profiles.mjs
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl:
    connectionString.includes('rds.amazonaws.com') ||
    connectionString.includes('sslmode=require')
      ? 'require'
      : undefined,
});

const DEMO_PROFILES = [
  {
    phone: '9000000001',
    fullName: 'Ananya Krishnan',
    gender: 'Female',
    dob: '1997-03-12',
    city: 'Chennai',
    state: 'Tamil Nadu',
    caste: 'Iyer',
    heightCm: 162,
    educationLevel: 'Masters',
    degree: 'MBA',
    employmentStatus: 'Employed',
    profession: 'Product Manager',
    companySector: 'MNC',
    annualIncome: '12-15 Lakh',
    diet: 'Vegetarian',
    manglik: 'No',
    rashi: 'Kanya',
    nakshatra: 'Hasta',
    verificationStatus: 'pending',
  },
  {
    phone: '9000000002',
    fullName: 'Priya Venkatesh',
    gender: 'Female',
    dob: '1999-07-21',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    caste: 'Iyengar',
    heightCm: 158,
    educationLevel: 'Bachelors',
    degree: 'B.E. CSE',
    employmentStatus: 'Employed',
    profession: 'Software Engineer',
    companySector: 'Private',
    annualIncome: '8-10 Lakh',
    diet: 'Vegetarian',
    manglik: "Don't Know",
    rashi: 'Vrishabha',
    nakshatra: 'Rohini',
    // idle, not pending: the seed creates no profile_photos, and the
    // verification gate requires >= 1 photo before submit-verification.
    verificationStatus: 'pending',
  },
  {
    phone: '9000000003',
    fullName: 'Meera Subramanian',
    gender: 'Female',
    dob: '1995-11-05',
    city: 'Madurai',
    state: 'Tamil Nadu',
    caste: 'Mudaliar',
    heightCm: 165,
    educationLevel: 'Masters',
    degree: 'M.Sc Biotechnology',
    employmentStatus: 'Employed',
    profession: 'Research Associate',
    companySector: 'Private',
    annualIncome: '6-8 Lakh',
    diet: 'Eggetarian',
    manglik: 'No',
    rashi: 'Simha',
    nakshatra: 'Magha',
    verificationStatus: 'pending',
  },
  {
    phone: '9000000004',
    fullName: 'Divya Rajan',
    gender: 'Female',
    dob: '1998-01-30',
    city: 'Bengaluru',
    state: 'Karnataka',
    caste: 'Brahmin',
    heightCm: 160,
    educationLevel: 'Bachelors',
    degree: 'B.Com',
    employmentStatus: 'Business Owner',
    profession: 'Boutique Owner',
    companySector: 'Business',
    annualIncome: '10-12 Lakh',
    diet: 'Vegetarian',
    manglik: 'Yes',
    rashi: 'Makara',
    nakshatra: 'Uttara Ashadha',
    verificationStatus: 'pending',
  },
  {
    phone: '9000000005',
    fullName: 'Lakshmi Narayanan',
    gender: 'Female',
    dob: '1996-09-18',
    city: 'Hyderabad',
    state: 'Telangana',
    caste: 'Nair',
    heightCm: 167,
    educationLevel: 'Doctorate',
    degree: 'PhD Chemistry',
    employmentStatus: 'Employed',
    profession: 'Scientist',
    companySector: 'Govt',
    annualIncome: '15-20 Lakh',
    diet: 'Vegetarian',
    manglik: 'No',
    rashi: 'Meena',
    nakshatra: 'Revati',
    verificationStatus: 'pending',
  },
  {
    phone: '9000000006',
    fullName: 'Arjun Raman',
    gender: 'Male',
    dob: '1994-04-08',
    city: 'Chennai',
    state: 'Tamil Nadu',
    caste: 'Iyer',
    heightCm: 178,
    educationLevel: 'Masters',
    degree: 'M.Tech',
    employmentStatus: 'Employed',
    profession: 'Engineering Manager',
    companySector: 'MNC',
    annualIncome: '25-30 Lakh',
    diet: 'Vegetarian',
    manglik: 'No',
    rashi: 'Dhanu',
    nakshatra: 'Purva Ashadha',
    verificationStatus: 'pending',
  },
  {
    phone: '9000000007',
    fullName: 'Karthik Suresh',
    gender: 'Male',
    dob: '1993-12-14',
    city: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    caste: 'Gounder',
    heightCm: 175,
    educationLevel: 'Bachelors',
    degree: 'B.E. Mechanical',
    employmentStatus: 'Business Owner',
    profession: 'Manufacturer',
    companySector: 'Business',
    annualIncome: '20-25 Lakh',
    diet: 'Non-vegetarian',
    manglik: "Don't Know",
    rashi: 'Kumbha',
    nakshatra: 'Shatabhisha',
    // idle, not pending: the seed creates no profile_photos, and the
    // verification gate requires >= 1 photo before submit-verification.
    verificationStatus: 'pending',
  },
  {
    phone: '9000000008',
    fullName: 'Vikram Iyer',
    gender: 'Male',
    dob: '1992-06-22',
    city: 'Mumbai',
    state: 'Maharashtra',
    caste: 'Brahmin',
    heightCm: 180,
    educationLevel: 'Masters',
    degree: 'CA',
    employmentStatus: 'Employed',
    profession: 'Chartered Accountant',
    companySector: 'Private',
    annualIncome: '18-20 Lakh',
    diet: 'Vegetarian',
    manglik: 'No',
    rashi: 'Tula',
    nakshatra: 'Swati',
    verificationStatus: 'pending',
  },
  {
    phone: '9000000009',
    fullName: 'Siddharth Nair',
    gender: 'Male',
    dob: '1995-02-27',
    city: 'Kochi',
    state: 'Kerala',
    caste: 'Nair',
    heightCm: 172,
    educationLevel: 'Bachelors',
    degree: 'MBBS',
    employmentStatus: 'Employed',
    profession: 'Doctor',
    companySector: 'Private',
    annualIncome: '15-20 Lakh',
    diet: 'Non-vegetarian',
    manglik: 'Both',
    rashi: 'Mesha',
    nakshatra: 'Ashwini',
    verificationStatus: 'pending',
  },
  {
    phone: '9000000010',
    fullName: 'Rohan Menon',
    gender: 'Male',
    dob: '1991-08-03',
    city: 'Pune',
    state: 'Maharashtra',
    caste: 'Menon',
    heightCm: 176,
    educationLevel: 'Masters',
    degree: 'MS Computer Science',
    employmentStatus: 'Employed',
    profession: 'Data Scientist',
    companySector: 'Startup',
    annualIncome: '30-40 Lakh',
    diet: 'Eggetarian',
    manglik: 'No',
    rashi: 'Vrischika',
    nakshatra: 'Anuradha',
    verificationStatus: 'pending',
  },
  {
    phone: '9000000011',
    fullName: 'Rahul Sharma',
    gender: 'Male',
    dob: '1990-05-15',
    city: 'Delhi',
    state: 'Delhi',
    caste: 'Brahmin',
    heightCm: 175,
    educationLevel: 'Bachelors',
    degree: 'B.Tech',
    employmentStatus: 'Employed',
    profession: 'Software Engineer',
    companySector: 'Private',
    annualIncome: '15-20 Lakh',
    diet: 'Vegetarian',
    manglik: 'No',
    rashi: 'Mesha',
    nakshatra: 'Ashwini',
    verificationStatus: 'pending',
  },
  {
    phone: '9000000012',
    fullName: 'Amit Patel',
    gender: 'Male',
    dob: '1992-09-10',
    city: 'Ahmedabad',
    state: 'Gujarat',
    caste: 'Patel',
    heightCm: 170,
    educationLevel: 'Masters',
    degree: 'MBA',
    employmentStatus: 'Business Owner',
    profession: 'Entrepreneur',
    companySector: 'Business',
    annualIncome: '25-30 Lakh',
    diet: 'Vegetarian',
    manglik: 'No',
    rashi: 'Kumbha',
    nakshatra: 'Shatabhisha',
    verificationStatus: 'pending',
  },
  {
    phone: '9000000013',
    fullName: 'Suresh Kumar',
    gender: 'Male',
    dob: '1993-11-20',
    city: 'Chennai',
    state: 'Tamil Nadu',
    caste: 'Mudaliar',
    heightCm: 173,
    educationLevel: 'Bachelors',
    degree: 'B.Sc Computer Science',
    employmentStatus: 'Employed',
    profession: 'Systems Analyst',
    companySector: 'MNC',
    annualIncome: '10-12 Lakh',
    diet: 'Non-vegetarian',
    manglik: 'No',
    rashi: 'Tula',
    nakshatra: 'Swati',
    verificationStatus: 'pending',
  },
];

async function upsertDemoProfile(tx, demo) {
  const existing = await tx`
    SELECT id FROM users WHERE phone = ${demo.phone} LIMIT 1
  `;

  let userId = existing[0]?.id;
  if (!userId) {
    userId = randomUUID();
    await tx`
      INSERT INTO users (
        id, phone, role, status, is_phone_verified, consent_accepted, consent_timestamp
      ) VALUES (
        ${userId}::uuid, ${demo.phone}, 'member', 'active', true, true, NOW()
      )
    `;
  } else {
    await tx`
      UPDATE users
      SET role = 'member', status = 'active',
          is_phone_verified = true, consent_accepted = true,
          updated_at = NOW()
      WHERE id = ${userId}::uuid
    `;
  }

  await tx`
    INSERT INTO user_settings (user_id)
    VALUES (${userId}::uuid)
    ON CONFLICT (user_id) DO NOTHING
  `;

  const existingProfile = await tx`
    SELECT id FROM profiles WHERE user_id = ${userId}::uuid LIMIT 1
  `;

  let profileId = existingProfile[0]?.id;
  if (!profileId) {
    profileId = randomUUID();
    await tx`
      INSERT INTO profiles (
        id, user_id, created_by, profile_for, full_name, gender, dob, marital_status,
        height_cm, city, state, country, religion, caste, mother_tongue,
        education_level, degree, employment_status, profession, company_sector,
        annual_income, photo_privacy, about_me
      ) VALUES (
        ${profileId}::uuid, ${userId}::uuid, 'self', 'Myself', ${demo.fullName},
        ${demo.gender}, ${demo.dob}, 'Never Married',
        ${demo.heightCm}, ${demo.city}, ${demo.state}, 'India', 'Hindu', ${demo.caste}, 'Tamil',
        ${demo.educationLevel}, ${demo.degree}, ${demo.employmentStatus}, ${demo.profession},
        ${demo.companySector}, ${demo.annualIncome}, 'blurred',
        ${`Demo profile for ${demo.fullName}. Looking for a life partner who values family and culture.`}
      )
    `;
  } else {
    await tx`
      UPDATE profiles SET
        full_name = ${demo.fullName},
        gender = ${demo.gender},
        dob = ${demo.dob},
        height_cm = ${demo.heightCm},
        city = ${demo.city},
        state = ${demo.state},
        caste = ${demo.caste},
        education_level = ${demo.educationLevel},
        degree = ${demo.degree},
        employment_status = ${demo.employmentStatus},
        profession = ${demo.profession},
        company_sector = ${demo.companySector},
        annual_income = ${demo.annualIncome},
        updated_at = NOW()
      WHERE id = ${profileId}::uuid
    `;
  }

  await tx`
    INSERT INTO family_details (
      profile_id, family_values, family_type, father_occupation, mother_occupation,
      brothers_count, sisters_count
    ) VALUES (
      ${profileId}::uuid, 'Moderate', 'Nuclear', 'Employed', 'Homemaker', 1, 1
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      family_values = EXCLUDED.family_values,
      family_type = EXCLUDED.family_type,
      updated_at = NOW()
  `;

  await tx`
    INSERT INTO lifestyle_interests (
      profile_id, diet, smoking, alcohol, interests
    ) VALUES (
      ${profileId}::uuid, ${demo.diet}, 'Never', 'Never',
      ${JSON.stringify(['Travel', 'Reading', 'Music'])}::jsonb
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      diet = EXCLUDED.diet,
      smoking = EXCLUDED.smoking,
      alcohol = EXCLUDED.alcohol,
      updated_at = NOW()
  `;

  await tx`
    INSERT INTO horoscopes (
      profile_id, birth_time, birth_place, manglik, rashi, nakshatra
    ) VALUES (
      ${profileId}::uuid, '10:30 AM', ${demo.city}, ${demo.manglik}, ${demo.rashi}, ${demo.nakshatra}
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      birth_place = EXCLUDED.birth_place,
      manglik = EXCLUDED.manglik,
      rashi = EXCLUDED.rashi,
      nakshatra = EXCLUDED.nakshatra,
      updated_at = NOW()
  `;

  const prefAgeMin = demo.gender === 'Female' ? 26 : 22;
  const prefAgeMax = demo.gender === 'Female' ? 36 : 30;
  await tx`
    INSERT INTO partner_preferences (
      profile_id, pref_age_min, pref_age_max,
      pref_marital_statuses, pref_religions, pref_castes, pref_mother_tongues,
      pref_acceptable_incomes, pref_locations
    ) VALUES (
      ${profileId}::uuid, ${prefAgeMin}, ${prefAgeMax},
      ${JSON.stringify(['Never Married'])}::jsonb,
      ${JSON.stringify(['Hindu'])}::jsonb,
      ${JSON.stringify([demo.caste])}::jsonb,
      ${JSON.stringify(['Tamil'])}::jsonb,
      '[]'::jsonb,
      ${JSON.stringify([demo.city])}::jsonb
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      pref_age_min = EXCLUDED.pref_age_min,
      pref_age_max = EXCLUDED.pref_age_max,
      pref_marital_statuses = EXCLUDED.pref_marital_statuses,
      pref_religions = EXCLUDED.pref_religions,
      pref_castes = EXCLUDED.pref_castes,
      pref_mother_tongues = EXCLUDED.pref_mother_tongues,
      updated_at = NOW()
  `;

  const method = demo.verificationStatus === 'idle' ? 'selfie' : 'selfie';
  await tx`
    INSERT INTO verifications (profile_id, method, status)
    VALUES (${profileId}::uuid, ${method}, ${demo.verificationStatus})
    ON CONFLICT (profile_id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = NOW()
  `;

  return { phone: demo.phone, userId, profileId, fullName: demo.fullName };
}

async function main() {
  const inserted = [];

  await sql.begin(async (tx) => {
    for (const demo of DEMO_PROFILES) {
      inserted.push(await upsertDemoProfile(tx, demo));
    }
  });

  const phones = DEMO_PROFILES.map((d) => d.phone);
  const verification = await sql`
    SELECT
      u.phone,
      u.role,
      p.id AS profile_id,
      p.full_name,
      p.user_id,
      (fd.id IS NOT NULL) AS has_family,
      (li.id IS NOT NULL) AS has_lifestyle,
      (h.id IS NOT NULL) AS has_horoscope,
      (pp.id IS NOT NULL) AS has_prefs,
      (v.id IS NOT NULL) AS has_verification,
      (us.id IS NOT NULL) AS has_settings,
      v.status AS verification_status
    FROM users u
    INNER JOIN profiles p ON p.user_id = u.id
    LEFT JOIN family_details fd ON fd.profile_id = p.id
    LEFT JOIN lifestyle_interests li ON li.profile_id = p.id
    LEFT JOIN horoscopes h ON h.profile_id = p.id
    LEFT JOIN partner_preferences pp ON pp.profile_id = p.id
    LEFT JOIN verifications v ON v.profile_id = p.id
    LEFT JOIN user_settings us ON us.user_id = u.id
    WHERE u.phone = ANY(${phones})
    ORDER BY u.phone
  `;

  const incomplete = verification.filter(
    (row) =>
      !row.has_family ||
      !row.has_lifestyle ||
      !row.has_horoscope ||
      !row.has_prefs ||
      !row.has_verification ||
      !row.has_settings ||
      row.role !== 'member',
  );

  const counts = await sql`
    SELECT
      (SELECT count(*)::int FROM users WHERE role = 'member') AS member_users,
      (SELECT count(*)::int FROM profiles) AS profiles,
      (SELECT count(*)::int FROM users WHERE role IN ('admin', 'moderator')) AS staff_users
  `;

  console.log(
    JSON.stringify(
      {
        seeded: inserted.length,
        fkGraphComplete: incomplete.length === 0,
        incompleteCount: incomplete.length,
        incomplete,
        rows: verification.map((r) => ({
          phone: r.phone,
          fullName: r.full_name,
          profileId: r.profile_id,
          userId: r.user_id,
          verificationStatus: r.verification_status,
          graph: {
            family: r.has_family,
            lifestyle: r.has_lifestyle,
            horoscope: r.has_horoscope,
            prefs: r.has_prefs,
            verification: r.has_verification,
            settings: r.has_settings,
          },
        })),
        totals: counts[0],
      },
      null,
      2,
    ),
  );

  if (incomplete.length > 0) {
    console.error('FK graph incomplete for some demo profiles');
    process.exit(1);
  }

  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  try {
    await sql.end({ timeout: 5 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
