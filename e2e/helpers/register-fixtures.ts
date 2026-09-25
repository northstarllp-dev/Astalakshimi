/**
 * Register-flow E2E fixtures (partner preferences at signup).
 *
 * Creates one fresh registrant — a user row with NO profile yet — plus two
 * deterministic candidates used to prove the engine honours the preferences
 * the member actually chose during signup:
 *
 *   - MATCH_PHONE    → Hindu / Brahmin / Tamil / Chennai, age 32, Masters
 *                      → satisfies the chosen prefs (age 28-40, Hindu, …)
 *   - NON_MATCH_PHONE → Christian / age 26 / Diploma
 *                      → excluded by BOTH the chosen religion and age window,
 *                        yet would have slipped through the old fabricated
 *                        defaults (age 24-32, religion [Hindu]).
 *
 * OTP and S3 uploads need external providers, so the browser tests
 * authenticate with a locally-minted JWT cookie and start the wizard from a
 * seeded draft — same approach as e2e/helpers/match-fixtures.ts.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { getFixtureDb, closeFixtureDb, mintAccessToken } from './match-fixtures';

// pnpm doesn't hoist workspace deps — resolve dotenv from the owning package.
const dbRequire = createRequire(resolve(__dirname, '../../packages/database/package.json'));
const dotenv = dbRequire('dotenv') as typeof import('dotenv');
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Distinct from every other fixture range (auth-fixtures owns 81/82/99,
// match-fixtures owns 91/92/93) so one spec's cleanup never deletes another's
// seeded users.
export const REGISTRANT_PHONE = '9100000071';
export const MATCH_PHONE = '9100000072';
export const NON_MATCH_PHONE = '9100000073';
const ALL_PHONES = [REGISTRANT_PHONE, MATCH_PHONE, NON_MATCH_PHONE];

// Letters and spaces only — the registration schema rejects digits in names.
export const REGISTRANT_NAME = 'Test Registrant';

/** The preferences this member picks in the wizard (deliberately ≠ the old
 *  fabricated defaults of age 24-32 / religion [Hindu] / no education). */
export const CHOSEN_PREFS = {
  prefAgeMin: 28,
  prefAgeMax: 40,
  prefReligions: ['Hindu', 'Jain'],
  prefCastes: ['Brahmin'],
  prefMotherTongues: ['Tamil'],
  prefMaritalStatuses: ['Never Married', 'Divorced'],
  prefMinEducation: 'Masters',
  prefAcceptableIncomes: ['₹10 – 15 Lakh', '₹15 – 20 Lakh'],
  prefLocations: ['Chennai'],
  prefHeightMinCm: 150,
  prefHeightMaxCm: 190,
};

export interface RegisterFixtures {
  token: string;
  userId: string;
  matchProfileId: string;
  nonMatchProfileId: string;
}

export async function cleanupRegisterFixtures() {
  const dbi = getFixtureDb();
  for (const phone of ALL_PHONES) {
    await dbi`DELETE FROM users WHERE phone = ${phone}`;
  }
}

export async function closeRegisterFixtures() {
  await closeFixtureDb();
}

async function insertCandidate(opts: {
  phone: string;
  fullName: string;
  dob: string;
  heightCm: number;
  city: string;
  citySlug: string;
  religion: string;
  caste: string;
  communitySlug: string;
  motherTongue: string;
  educationLevel: string;
}) {
  const dbi = getFixtureDb();
  const [user] = await dbi`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${opts.phone}, true, true, NOW(), 'member', 'active')
    RETURNING id
  `;
  const [profile] = await dbi`
    INSERT INTO profiles (
      user_id, created_by, profile_for, full_name, gender, dob, marital_status,
      height_cm, about_me, city, state, country, city_slug,
      religion, caste, community_slug, mother_tongue,
      education_level, degree, college_name, employment_status, profession, company_name, company_sector, annual_income,
      photo_privacy, required_complete
    ) VALUES (
      ${user.id}, 'self', 'Myself', ${opts.fullName}, 'Female', ${opts.dob}, 'Never Married',
      ${opts.heightCm}, 'E2E fixture profile for register-preference tests.', ${opts.city}, 'Tamil Nadu', 'India', ${opts.citySlug},
      ${opts.religion}, ${opts.caste}, ${opts.communitySlug}, ${opts.motherTongue},
      ${opts.educationLevel}, 'B.Tech', 'E2E Institute', 'Employed', 'Software Engineer', 'E2E Corp', 'Private', '₹10 – 15 Lakh',
      'visible', true
    )
    RETURNING id
  `;
  await dbi`
    INSERT INTO profile_photos (profile_id, s3_key, is_primary, display_order, status)
    VALUES (${profile.id}, ${`e2e/${user.id}/primary.webp`}, true, 0, 'approved')
  `;
  await dbi`
    INSERT INTO user_settings (user_id, photo_blur)
    VALUES (${user.id}, 'never')
  `;
  return profile as { id: string };
}

export async function seedRegisterFixtures(): Promise<RegisterFixtures> {
  const dbi = getFixtureDb();
  await cleanupRegisterFixtures();

  // --- Registrant: user row only, no profile — mid-onboarding ---
  const [registrant] = await dbi`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${REGISTRANT_PHONE}, true, true, NOW(), 'member', 'active')
    RETURNING id, phone, role
  `;

  const matchProfile = await insertCandidate({
    phone: MATCH_PHONE,
    fullName: 'E2E Pref Match',
    dob: '1993-06-15', // ~32 → inside the chosen 28-40 window
    heightCm: 165,
    city: 'Chennai',
    citySlug: 'chennai-tamil-nadu',
    religion: 'Hindu',
    caste: 'Brahmin',
    communitySlug: 'hindu-brahmin',
    motherTongue: 'Tamil',
    educationLevel: 'Masters',
  });

  const nonMatchProfile = await insertCandidate({
    phone: NON_MATCH_PHONE,
    fullName: 'E2E Pref Mismatch',
    dob: '1999-06-15', // ~26 → below the chosen min age (and old defaults would allow it)
    heightCm: 165,
    city: 'Chennai',
    citySlug: 'chennai-tamil-nadu',
    religion: 'Christian',
    caste: 'Latin Catholic',
    communitySlug: 'christian-latin-catholic',
    motherTongue: 'Tamil',
    educationLevel: 'Diploma',
  });

  return {
    token: mintAccessToken(registrant as { id: string; phone: string; role: string }),
    userId: registrant.id as string,
    matchProfileId: matchProfile.id,
    nonMatchProfileId: nonMatchProfile.id,
  };
}

/**
 * A signup draft with steps 1-4 already complete (identity + community), so
 * `loadSignupDraft()` infers step 5 — the partner-preferences step.
 */
export function completeDraftData(phone: string) {
  return {
    phone,
    otp: '',
    consentAccepted: true,
    profileFor: 'Myself',
    fullName: REGISTRANT_NAME,
    gender: 'Male',
    dobDay: '15',
    dobMonth: '06',
    dobYear: '1995',
    maritalStatus: 'Never Married',
    height: "5'9\"",
    diet: 'Vegetarian',
    city: 'Chennai',
    state: 'Tamil Nadu',
    citySlug: 'chennai-tamil-nadu',
    religion: 'Hindu',
    caste: 'Brahmin',
    communitySlug: 'hindu-brahmin',
    motherTongue: 'Tamil',
    familyType: 'Nuclear',
    familyValues: 'Moderate',
    familyStatus: 'Middle class',
    fatherOccupation: 'Employed',
    motherOccupation: 'Homemaker',
    brothersCount: 1,
    sistersCount: 0,
    submittedAt: '',
  };
}
