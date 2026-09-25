/**
 * Interest-flow E2E fixtures: sender + receiver + bystander.
 * Phones are distinct from match-fixtures (91…091–095).
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mintAccessToken, getFixtureDb, closeFixtureDb } from './match-fixtures';

const dbRequire = createRequire(resolve(__dirname, '../../packages/database/package.json'));
const dotenv = dbRequire('dotenv') as typeof import('dotenv');
dotenv.config({ path: resolve(__dirname, '../../.env') });

export const SENDER_PHONE = '9100000081';
export const RECEIVER_PHONE = '9100000082';
export const BYSTANDER_PHONE = '9100000083';
const ALL_PHONES = [SENDER_PHONE, RECEIVER_PHONE, BYSTANDER_PHONE];

export const SENDER_NAME = 'E2E Interest Sender';
export const RECEIVER_NAME = 'E2E Interest Receiver';
export const BYSTANDER_NAME = 'E2E Interest Bystander';

export interface InterestFixtures {
  senderToken: string;
  receiverToken: string;
  bystanderToken: string;
  senderProfileId: string;
  receiverProfileId: string;
  bystanderProfileId: string;
}

async function seedMember(opts: {
  phone: string;
  fullName: string;
  gender: 'Male' | 'Female';
  dob: string;
}) {
  const dbi = getFixtureDb();
  const [user] = await dbi`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${opts.phone}, true, true, NOW(), 'member', 'active')
    RETURNING id, phone, role
  `;

  const [profile] = await dbi`
    INSERT INTO profiles (
      user_id, created_by, profile_for, full_name, gender, dob, marital_status,
      height_cm, about_me, city, state, country, city_slug,
      religion, caste, community_slug, mother_tongue,
      education_level, degree, college_name, employment_status, profession, company_name, company_sector, annual_income,
      photo_privacy, required_complete
    ) VALUES (
      ${user.id}, 'self', 'Myself', ${opts.fullName}, ${opts.gender}, ${opts.dob}, 'Never Married',
      170, 'E2E interest fixture profile.', 'Chennai', 'Tamil Nadu', 'India', 'chennai-tamil-nadu',
      'Hindu', 'Brahmin', 'hindu-brahmin', 'Tamil',
      'Bachelors', 'B.Tech', 'E2E Institute', 'Employed', 'Software Engineer', 'E2E Corp', 'Private', '₹10 – 15 Lakh',
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
  await dbi`
    INSERT INTO verifications (profile_id, method, status)
    VALUES (${profile.id}, 'selfie', 'verified')
  `;
  await dbi`
    INSERT INTO lifestyle_interests (profile_id, diet, smoking, alcohol)
    VALUES (${profile.id}, 'Vegetarian', 'Never', 'Never')
  `;
  await dbi`
    INSERT INTO horoscopes (profile_id, birth_time, birth_place, manglik, rashi, nakshatra)
    VALUES (${profile.id}, '10:45 AM', 'Chennai', 'No', 'Mesha', 'Ashwini')
  `;
  await dbi`
    INSERT INTO partner_preferences (
      profile_id, pref_age_min, pref_age_max, pref_height_min_cm, pref_height_max_cm,
      pref_marital_statuses, pref_religions, pref_castes, pref_mother_tongues,
      pref_min_education, pref_acceptable_incomes, pref_locations
    ) VALUES (
      ${profile.id}, 24, 36, 150, 190,
      ${JSON.stringify(['Never Married'])}::jsonb, ${JSON.stringify(['Hindu'])}::jsonb,
      ${JSON.stringify(['Brahmin'])}::jsonb, ${JSON.stringify(['Tamil'])}::jsonb,
      'Bachelors', ${JSON.stringify([])}::jsonb, ${JSON.stringify(['Chennai'])}::jsonb
    )
  `;

  return {
    user: user as { id: string; phone: string; role: string },
    profileId: profile.id as string,
  };
}

export async function cleanupInterestFixtures() {
  const dbi = getFixtureDb();
  for (const phone of ALL_PHONES) {
    await dbi`DELETE FROM users WHERE phone = ${phone}`;
  }
}

export async function closeInterestFixtures() {
  await closeFixtureDb();
}

export async function seedInterestFixtures(): Promise<InterestFixtures> {
  await cleanupInterestFixtures();

  const sender = await seedMember({
    phone: SENDER_PHONE,
    fullName: SENDER_NAME,
    gender: 'Male',
    dob: '1996-04-12',
  });
  const receiver = await seedMember({
    phone: RECEIVER_PHONE,
    fullName: RECEIVER_NAME,
    gender: 'Female',
    dob: '1998-03-10',
  });
  const bystander = await seedMember({
    phone: BYSTANDER_PHONE,
    fullName: BYSTANDER_NAME,
    gender: 'Male',
    dob: '1995-07-01',
  });

  return {
    senderToken: mintAccessToken(sender.user),
    receiverToken: mintAccessToken(receiver.user),
    bystanderToken: mintAccessToken(bystander.user),
    senderProfileId: sender.profileId,
    receiverProfileId: receiver.profileId,
    bystanderProfileId: bystander.profileId,
  };
}
