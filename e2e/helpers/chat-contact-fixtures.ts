/**
 * Two verified members with an accepted interest, so chat send is allowed
 * except where the contact guard blocks the text.
 */
import { getFixtureDb, closeMatchFixtures, mintAccessToken } from './match-fixtures';

export const CHAT_SENDER_PHONE = '9100000081';
export const CHAT_PARTNER_PHONE = '9100000082';
export const CHAT_PARTNER_NAME = 'E2E Chat Partner';

const PHONES = [CHAT_SENDER_PHONE, CHAT_PARTNER_PHONE];

export interface ChatContactFixtures {
  token: string;
  senderProfileId: string;
  partnerProfileId: string;
}

async function seedMember(phone: string, fullName: string, gender: 'Male' | 'Female') {
  const dbi = getFixtureDb();
  const [user] = await dbi`
    INSERT INTO users (phone, is_phone_verified, consent_accepted, consent_timestamp, role, status)
    VALUES (${phone}, true, true, NOW(), 'member', 'active')
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
      ${user.id}, 'self', 'Myself', ${fullName}, ${gender}, '1996-04-12', 'Never Married',
      170, 'E2E fixture profile for chat contact-guard tests.', 'Chennai', 'Tamil Nadu', 'India', 'chennai-tamil-nadu',
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
  return {
    user: user as { id: string; phone: string; role: string },
    profileId: profile.id as string,
  };
}

async function seedPartnerPreferences(profileId: string) {
  const dbi = getFixtureDb();
  await dbi`
    INSERT INTO partner_preferences (
      profile_id, pref_age_min, pref_age_max, pref_height_min_cm, pref_height_max_cm,
      pref_marital_statuses, pref_religions, pref_castes, pref_mother_tongues,
      pref_min_education, pref_acceptable_incomes, pref_locations
    ) VALUES (
      ${profileId}, 25, 35, 150, 190,
      ${JSON.stringify(['Never Married'])}::jsonb, ${JSON.stringify(['Hindu'])}::jsonb,
      ${JSON.stringify(['Brahmin'])}::jsonb, ${JSON.stringify(['Tamil'])}::jsonb,
      'Bachelors', ${JSON.stringify([])}::jsonb, ${JSON.stringify(['Chennai'])}::jsonb
    )
  `;
}

export async function cleanupChatThreadMessages(senderProfileId: string, partnerProfileId: string) {
  const dbi = getFixtureDb();
  await dbi`
    DELETE FROM messages
    WHERE (sender_profile_id = ${senderProfileId} AND receiver_profile_id = ${partnerProfileId})
       OR (sender_profile_id = ${partnerProfileId} AND receiver_profile_id = ${senderProfileId})
  `;
}

export async function cleanupChatContactFixtures() {
  const dbi = getFixtureDb();
  for (const phone of PHONES) {
    await dbi`DELETE FROM users WHERE phone = ${phone}`;
  }
}

export async function seedChatContactFixtures(): Promise<ChatContactFixtures> {
  await cleanupChatContactFixtures();
  const sender = await seedMember(CHAT_SENDER_PHONE, 'E2E Chat Sender', 'Male');
  const partner = await seedMember(CHAT_PARTNER_PHONE, CHAT_PARTNER_NAME, 'Female');
  await seedPartnerPreferences(sender.profileId);
  const dbi = getFixtureDb();
  await dbi`
    INSERT INTO interests (sender_profile_id, receiver_profile_id, status, responded_at)
    VALUES (${sender.profileId}, ${partner.profileId}, 'accepted', NOW())
  `;
  return {
    token: mintAccessToken(sender.user),
    senderProfileId: sender.profileId,
    partnerProfileId: partner.profileId,
  };
}

export async function closeChatContactFixtures() {
  await closeMatchFixtures();
}
