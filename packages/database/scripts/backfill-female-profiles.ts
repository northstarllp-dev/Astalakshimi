/**
 * Seed discoverable female demo profiles with varied height, profession,
 * mother tongue, and community — all values come from the reference catalog.
 *
 * Usage:
 *   npx tsx scripts/backfill-female-profiles.ts
 *   npx tsx scripts/backfill-female-profiles.ts --cleanup
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../.env') });

const PHONE_PREFIX = '92000000';
const CLEANUP = process.argv.includes('--cleanup');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const sql = postgres(DATABASE_URL, {
  max: 1,
  ssl: DATABASE_URL.includes('sslmode=require') || DATABASE_URL.includes('rds.amazonaws.com')
    ? ('require' as const)
    : undefined,
});

type SeedProfile = {
  suffix: string;
  fullName: string;
  dob: string;
  heightCm: number;
  city: string;
  citySlug: string;
  state: string;
  religion: string;
  caste: string;
  communitySlug: string;
  motherTongue: string;
  profession: string;
  employmentStatus: 'Employed' | 'Business Owner' | 'Freelancer' | 'Not Working';
  aboutMe: string;
};

/** Catalog-backed values only — see packages/reference/src/generated/catalog-data.ts */
const FEMALE_PROFILES: SeedProfile[] = [
  {
    suffix: '01',
    fullName: 'Ananya Sharma',
    dob: '1997-03-18',
    heightCm: 158,
    city: 'Chennai',
    citySlug: 'chennai-tamil-nadu',
    state: 'Tamil Nadu',
    religion: 'Hindu',
    caste: 'Brahmin',
    communitySlug: 'hindu-brahmin',
    motherTongue: 'Tamil',
    profession: 'Software Engineer',
    employmentStatus: 'Employed',
    aboutMe: 'Product-minded engineer who enjoys classical music and weekend temple visits.',
  },
  {
    suffix: '02',
    fullName: 'Lakshmi Nadar',
    dob: '1998-07-02',
    heightCm: 152,
    city: 'Madurai',
    citySlug: 'madurai-tamil-nadu',
    state: 'Tamil Nadu',
    religion: 'Hindu',
    caste: 'Nadar',
    communitySlug: 'hindu-nadar',
    motherTongue: 'Tamil',
    profession: 'School Teacher',
    employmentStatus: 'Employed',
    aboutMe: 'Primary school teacher with a calm, family-first outlook on life.',
  },
  {
    suffix: '03',
    fullName: 'Divya Vellalar',
    dob: '1996-11-25',
    heightCm: 171,
    city: 'Tiruchirappalli',
    citySlug: 'tiruchirappalli-tamil-nadu',
    state: 'Tamil Nadu',
    religion: 'Hindu',
    caste: 'Vellalar',
    communitySlug: 'hindu-vellalar',
    motherTongue: 'Telugu',
    profession: 'Medical Officer',
    employmentStatus: 'Employed',
    aboutMe: 'General physician interested in community health and mindful living.',
  },
  {
    suffix: '04',
    fullName: 'Meera Chettiar',
    dob: '1999-01-09',
    heightCm: 165,
    city: 'Coimbatore',
    citySlug: 'coimbatore-tamil-nadu',
    state: 'Tamil Nadu',
    religion: 'Hindu',
    caste: 'Chettiar',
    communitySlug: 'hindu-chettiar',
    motherTongue: 'Malayalam',
    profession: 'Architect',
    employmentStatus: 'Freelancer',
    aboutMe: 'Freelance architect who loves heritage homes and thoughtful design.',
  },
  {
    suffix: '05',
    fullName: 'Kavya Gounder',
    dob: '1995-09-14',
    heightCm: 168,
    city: 'Bengaluru',
    citySlug: 'bengaluru-karnataka',
    state: 'Karnataka',
    religion: 'Hindu',
    caste: 'Gounder',
    communitySlug: 'hindu-gounder',
    motherTongue: 'Kannada',
    profession: 'Clinical Nurse',
    employmentStatus: 'Employed',
    aboutMe: 'ICU nurse with a warm personality and strong family values.',
  },
  {
    suffix: '06',
    fullName: 'Revathi Mudaliar',
    dob: '1997-12-30',
    heightCm: 162,
    city: 'Salem',
    citySlug: 'salem-tamil-nadu',
    state: 'Tamil Nadu',
    religion: 'Hindu',
    caste: 'Mudaliar',
    communitySlug: 'hindu-mudaliar',
    motherTongue: 'Tamil',
    profession: 'HR Manager',
    employmentStatus: 'Employed',
    aboutMe: 'People operations lead who enjoys reading and short hill trips.',
  },
  {
    suffix: '07',
    fullName: 'Shreya Agarwal',
    dob: '1996-05-22',
    heightCm: 175,
    city: 'Chennai',
    citySlug: 'chennai-tamil-nadu',
    state: 'Tamil Nadu',
    religion: 'Hindu',
    caste: 'Agarwal',
    communitySlug: 'hindu-agarwal',
    motherTongue: 'Hindi',
    profession: 'Corporate Lawyer',
    employmentStatus: 'Employed',
    aboutMe: 'In-house counsel with an interest in mediation and classical dance.',
  },
  {
    suffix: '08',
    fullName: 'Nandini Iyer',
    dob: '1998-04-06',
    heightCm: 160,
    city: 'Chennai',
    citySlug: 'chennai-tamil-nadu',
    state: 'Tamil Nadu',
    religion: 'Hindu',
    caste: 'Brahmin',
    communitySlug: 'hindu-brahmin',
    motherTongue: 'Marathi',
    profession: 'Data Analyst',
    employmentStatus: 'Employed',
    aboutMe: 'Analytics professional who values honesty, learning, and balanced living.',
  },
  {
    suffix: '09',
    fullName: 'Keerthi Pillai',
    dob: '1997-08-19',
    heightCm: 164,
    city: 'Coimbatore',
    citySlug: 'coimbatore-tamil-nadu',
    state: 'Tamil Nadu',
    religion: 'Hindu',
    caste: 'Pillai',
    communitySlug: 'hindu-pillai',
    motherTongue: 'Tamil',
    profession: 'Chartered Accountant',
    employmentStatus: 'Employed',
    aboutMe: 'Finance professional seeking a respectful, values-aligned partnership.',
  },
  {
    suffix: '10',
    fullName: 'Harini Sundaram',
    dob: '1999-10-11',
    heightCm: 154,
    city: 'Madurai',
    citySlug: 'madurai-tamil-nadu',
    state: 'Tamil Nadu',
    religion: 'Hindu',
    caste: 'Chettiar',
    communitySlug: 'hindu-chettiar',
    motherTongue: 'Tamil',
    profession: 'Pharmacist',
    employmentStatus: 'Employed',
    aboutMe: 'Retail pharmacist who enjoys cooking, devotional music, and family gatherings.',
  },
];

function phoneForSuffix(suffix: string) {
  return `${PHONE_PREFIX}${suffix}`;
}

async function cleanup() {
  const deleted = await sql`
    DELETE FROM users
    WHERE phone LIKE ${`${PHONE_PREFIX}%`}
    RETURNING phone
  `;
  console.log(`Removed ${deleted.length} backfill user(s).`);
}

async function seedOne(profile: SeedProfile) {
  const phone = phoneForSuffix(profile.suffix);

  const [user] = await sql`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${phone}, true, true, NOW(), 'member', 'active')
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  if (!user) {
    console.log(`Skipped ${profile.fullName} — phone ${phone} already exists.`);
    return;
  }

  const [row] = await sql`
    INSERT INTO profiles (
      user_id, created_by, profile_for, full_name, gender, dob, marital_status,
      height_cm, about_me, city, state, country, city_slug,
      religion, caste, community_slug, mother_tongue,
      education_level, degree, college_name, employment_status, profession, company_name, company_sector, annual_income,
      photo_privacy, required_complete
    ) VALUES (
      ${user.id}, 'staff', 'Myself', ${profile.fullName}, 'Female', ${profile.dob}, 'Never Married',
      ${profile.heightCm}, ${profile.aboutMe}, ${profile.city}, ${profile.state}, 'India', ${profile.citySlug},
      ${profile.religion}, ${profile.caste}, ${profile.communitySlug}, ${profile.motherTongue},
      'Masters', 'M.A.', 'Anna University', ${profile.employmentStatus}, ${profile.profession}, 'Demo Employer', 'Private', '₹10 – 15 Lakh',
      'visible', true
    )
    RETURNING id
  `;

  await sql`
    INSERT INTO profile_photos (profile_id, s3_key, is_primary, display_order, status)
    VALUES (${row.id}, ${`demo/female/${profile.suffix}/primary.webp`}, true, 0, 'approved')
  `;
  await sql`
    INSERT INTO user_settings (user_id, photo_blur)
    VALUES (${user.id}, 'never')
  `;
  await sql`
    INSERT INTO verifications (profile_id, method, status)
    VALUES (${row.id}, 'selfie', 'verified')
  `;
  await sql`
    INSERT INTO lifestyle_interests (profile_id, diet, smoking, alcohol)
    VALUES (${row.id}, 'Vegetarian', 'Never', 'Never')
  `;
  await sql`
    INSERT INTO horoscopes (profile_id, birth_time, birth_place, manglik, rashi, nakshatra)
    VALUES (${row.id}, '08:30 AM', ${profile.city}, 'No', 'Kanya', 'Chitra')
  `;
  await sql`
    INSERT INTO partner_preferences (
      profile_id, pref_age_min, pref_age_max, pref_height_min_cm, pref_height_max_cm,
      pref_marital_statuses, pref_religions, pref_castes, pref_mother_tongues,
      pref_min_education, pref_acceptable_incomes, pref_locations
    ) VALUES (
      ${row.id}, 27, 36, 165, 190,
      ${JSON.stringify(['Never Married'])}::jsonb, ${JSON.stringify(['Hindu'])}::jsonb,
      ${JSON.stringify([])}::jsonb, ${JSON.stringify([])}::jsonb,
      'Bachelors', ${JSON.stringify([])}::jsonb, ${JSON.stringify([profile.city])}::jsonb
    )
  `;

  console.log(
    `Seeded ${profile.fullName} (${phone}) — ${profile.heightCm} cm, ${profile.motherTongue}, ${profile.caste}, ${profile.profession}`,
  );
}

async function run() {
  if (CLEANUP) {
    await cleanup();
    return;
  }

  await cleanup();
  for (const profile of FEMALE_PROFILES) {
    await seedOne(profile);
  }
  console.log(`Done. Inserted up to ${FEMALE_PROFILES.length} female demo profiles.`);
}

run()
  .then(async () => {
    await sql.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await sql.end();
    process.exit(1);
  });
