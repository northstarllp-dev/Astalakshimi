-- Astalakshimi live schema dump
-- Generated: 2026-09-11T14:00:19.423Z
-- Source: RDS (schema-only, no data)

-- TABLE: blocked_profiles
CREATE TABLE IF NOT EXISTS "blocked_profiles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "blocker_id" uuid NOT NULL,
  "blocked_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: chat_sessions
CREATE TABLE IF NOT EXISTS "chat_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile1_id" uuid NOT NULL,
  "profile2_id" uuid NOT NULL,
  "is_blocked" boolean NOT NULL DEFAULT false,
  "blocked_reason" character varying(255),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: cities
CREATE TABLE IF NOT EXISTS "cities" (
  "id" integer NOT NULL DEFAULT nextval('cities_id_seq'::regclass),
  "state_id" integer NOT NULL,
  "name" character varying(100) NOT NULL,
  "slug" character varying(120) NOT NULL,
  "district" character varying(100)
);

-- TABLE: city_aliases
CREATE TABLE IF NOT EXISTS "city_aliases" (
  "id" integer NOT NULL DEFAULT nextval('city_aliases_id_seq'::regclass),
  "city_id" integer NOT NULL,
  "alias" character varying(100) NOT NULL,
  "normalized_alias" character varying(100) NOT NULL
);

-- TABLE: communities
CREATE TABLE IF NOT EXISTS "communities" (
  "id" integer NOT NULL DEFAULT nextval('communities_id_seq'::regclass),
  "religion" character varying(50) NOT NULL,
  "name" character varying(100) NOT NULL,
  "slug" character varying(120) NOT NULL
);

-- TABLE: community_aliases
CREATE TABLE IF NOT EXISTS "community_aliases" (
  "id" integer NOT NULL DEFAULT nextval('community_aliases_id_seq'::regclass),
  "community_id" integer NOT NULL,
  "alias" character varying(100) NOT NULL,
  "normalized_alias" character varying(100) NOT NULL
);

-- TABLE: companies
CREATE TABLE IF NOT EXISTS "companies" (
  "id" integer NOT NULL DEFAULT nextval('companies_id_seq'::regclass),
  "name" character varying(200) NOT NULL,
  "sector" character varying(80),
  "display_order" integer NOT NULL DEFAULT 0
);

-- TABLE: company_aliases
CREATE TABLE IF NOT EXISTS "company_aliases" (
  "id" integer NOT NULL DEFAULT nextval('company_aliases_id_seq'::regclass),
  "company_id" integer NOT NULL,
  "alias" character varying(200) NOT NULL,
  "normalized_alias" character varying(200) NOT NULL
);

-- TABLE: education_aliases
CREATE TABLE IF NOT EXISTS "education_aliases" (
  "id" integer NOT NULL DEFAULT nextval('education_aliases_id_seq'::regclass),
  "education_id" integer NOT NULL,
  "alias" character varying(100) NOT NULL,
  "normalized_alias" character varying(100) NOT NULL
);

-- TABLE: education_levels
CREATE TABLE IF NOT EXISTS "education_levels" (
  "id" integer NOT NULL DEFAULT nextval('education_levels_id_seq'::regclass),
  "name" character varying(100) NOT NULL,
  "display_order" integer NOT NULL
);

-- TABLE: family_details
CREATE TABLE IF NOT EXISTS "family_details" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL,
  "family_values" USER-DEFINED NOT NULL,
  "family_type" USER-DEFINED NOT NULL,
  "father_occupation" USER-DEFINED NOT NULL,
  "mother_occupation" USER-DEFINED NOT NULL,
  "brothers_count" integer NOT NULL DEFAULT 0,
  "sisters_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: gotra_aliases
CREATE TABLE IF NOT EXISTS "gotra_aliases" (
  "id" integer NOT NULL DEFAULT nextval('gotra_aliases_id_seq'::regclass),
  "gotra_id" integer NOT NULL,
  "alias" character varying(100) NOT NULL,
  "normalized_alias" character varying(100) NOT NULL
);

-- TABLE: gotras
CREATE TABLE IF NOT EXISTS "gotras" (
  "id" integer NOT NULL DEFAULT nextval('gotras_id_seq'::regclass),
  "religion" character varying(50),
  "name" character varying(100) NOT NULL,
  "slug" character varying(120) NOT NULL
);

-- TABLE: horoscopes
CREATE TABLE IF NOT EXISTS "horoscopes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL,
  "birth_time" character varying(20),
  "birth_place" character varying(100),
  "manglik" USER-DEFINED NOT NULL DEFAULT 'Don''t Know'::manglik_status,
  "rashi" character varying(50),
  "nakshatra" character varying(50),
  "horoscope_s3_key" character varying(500),
  "horoscope_file_name" character varying(255),
  "horoscope_file_size_bytes" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: interests
CREATE TABLE IF NOT EXISTS "interests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sender_profile_id" uuid NOT NULL,
  "receiver_profile_id" uuid NOT NULL,
  "status" USER-DEFINED NOT NULL DEFAULT 'pending'::interest_status,
  "message" text,
  "responded_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: lifestyle_interests
CREATE TABLE IF NOT EXISTS "lifestyle_interests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL,
  "diet" USER-DEFINED NOT NULL,
  "smoking" USER-DEFINED NOT NULL DEFAULT 'Never'::habit_frequency,
  "alcohol" USER-DEFINED NOT NULL DEFAULT 'Never'::habit_frequency,
  "interests" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: messages
CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "thread_id" character varying(255) NOT NULL,
  "sender_profile_id" uuid NOT NULL,
  "receiver_profile_id" uuid NOT NULL,
  "text" text NOT NULL,
  "is_read" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "title" character varying(300) NOT NULL,
  "body" text,
  "category" character varying(20) NOT NULL,
  "kind" character varying(30) NOT NULL,
  "href" character varying(300) NOT NULL,
  "is_read" boolean NOT NULL DEFAULT false,
  "paid_only" boolean NOT NULL DEFAULT false,
  "actor_profile_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: occupation_aliases
CREATE TABLE IF NOT EXISTS "occupation_aliases" (
  "id" integer NOT NULL DEFAULT nextval('occupation_aliases_id_seq'::regclass),
  "occupation_id" integer NOT NULL,
  "alias" character varying(150) NOT NULL,
  "normalized_alias" character varying(150) NOT NULL
);

-- TABLE: occupations
CREATE TABLE IF NOT EXISTS "occupations" (
  "id" integer NOT NULL DEFAULT nextval('occupations_id_seq'::regclass),
  "name" character varying(150) NOT NULL,
  "category" character varying(80),
  "display_order" integer NOT NULL
);

-- TABLE: otp_attempts
CREATE TABLE IF NOT EXISTS "otp_attempts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "phone" character varying(15) NOT NULL,
  "otp_hash" character varying(100) NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 5,
  "expires_at" timestamp with time zone NOT NULL,
  "verified" boolean NOT NULL DEFAULT false,
  "consent_accepted" boolean NOT NULL DEFAULT false,
  "referred_by" character varying(50),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: partner_preferences
CREATE TABLE IF NOT EXISTS "partner_preferences" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL,
  "pref_age_min" integer NOT NULL DEFAULT 21,
  "pref_age_max" integer NOT NULL DEFAULT 32,
  "pref_height_min_cm" integer NOT NULL DEFAULT 140,
  "pref_height_max_cm" integer NOT NULL DEFAULT 200,
  "pref_marital_statuses" jsonb NOT NULL DEFAULT '["Never Married"]'::jsonb,
  "pref_religions" jsonb NOT NULL DEFAULT '["Hindu"]'::jsonb,
  "pref_castes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "pref_mother_tongues" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "pref_min_education" character varying(50),
  "pref_acceptable_incomes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "pref_locations" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: payments
CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "plan_id" uuid,
  "amount_paise" integer NOT NULL,
  "currency" character varying(3) NOT NULL DEFAULT 'INR'::character varying,
  "provider" USER-DEFINED NOT NULL,
  "provider_order_id" character varying(100),
  "provider_payment_id" character varying(100),
  "provider_signature" character varying(500),
  "status" USER-DEFINED NOT NULL DEFAULT 'created'::payment_status,
  "failure_reason" text,
  "webhook_event_id" character varying(100),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "target_profile_id" uuid
);

-- TABLE: plans
CREATE TABLE IF NOT EXISTS "plans" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "slug" character varying(20) NOT NULL,
  "name" character varying(50) NOT NULL,
  "price_paise" integer NOT NULL,
  "duration_days" integer NOT NULL,
  "period_label" character varying(50) NOT NULL,
  "interest_quota" integer,
  "contact_unlocks" integer,
  "has_advanced_filters" boolean NOT NULL DEFAULT false,
  "has_priority_listing" boolean NOT NULL DEFAULT false,
  "badge" character varying(50),
  "tagline" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "display_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: profile_photos
CREATE TABLE IF NOT EXISTS "profile_photos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL,
  "s3_key" character varying(500) NOT NULL,
  "is_primary" boolean NOT NULL DEFAULT false,
  "display_order" integer NOT NULL DEFAULT 0,
  "status" USER-DEFINED NOT NULL DEFAULT 'pending'::photo_status,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "blur_data_url" text,
  "content_hash" character varying(64)
);

-- TABLE: profile_views
CREATE TABLE IF NOT EXISTS "profile_views" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "viewer_profile_id" uuid NOT NULL,
  "target_profile_id" uuid NOT NULL,
  "viewed_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: profiles
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "profile_for" character varying(20) NOT NULL,
  "full_name" character varying(100) NOT NULL,
  "gender" USER-DEFINED NOT NULL,
  "dob" date NOT NULL,
  "marital_status" USER-DEFINED NOT NULL,
  "has_children" boolean DEFAULT false,
  "children_count" integer DEFAULT 0,
  "children_living_with_me" boolean,
  "height_cm" integer NOT NULL,
  "about_me" text,
  "city" character varying(100) NOT NULL,
  "state" character varying(100) NOT NULL,
  "country" character varying(100) NOT NULL DEFAULT 'India'::character varying,
  "religion" character varying(50) NOT NULL,
  "caste" character varying(100) NOT NULL,
  "subcaste" character varying(100),
  "gotra" character varying(100),
  "mother_tongue" character varying(50) NOT NULL,
  "education_level" USER-DEFINED,
  "degree" character varying(150),
  "college_name" character varying(200),
  "employment_status" USER-DEFINED,
  "profession" character varying(150),
  "company_name" character varying(150),
  "company_sector" USER-DEFINED,
  "annual_income" character varying(50),
  "photo_privacy" USER-DEFINED NOT NULL DEFAULT 'blurred'::photo_privacy,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "education_id" integer,
  "specialization_id" integer,
  "occupation_id" integer,
  "company_id" integer,
  "created_by" character varying(20) NOT NULL DEFAULT 'self'::character varying
);

-- TABLE: shortlists
CREATE TABLE IF NOT EXISTS "shortlists" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL,
  "target_profile_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: specializations
CREATE TABLE IF NOT EXISTS "specializations" (
  "id" integer NOT NULL DEFAULT nextval('specializations_id_seq'::regclass),
  "education_id" integer NOT NULL,
  "name" character varying(150) NOT NULL,
  "display_order" integer NOT NULL DEFAULT 0
);

-- TABLE: states
CREATE TABLE IF NOT EXISTS "states" (
  "id" integer NOT NULL DEFAULT nextval('states_id_seq'::regclass),
  "name" character varying(100) NOT NULL,
  "country" character varying(100) NOT NULL DEFAULT 'India'::character varying,
  "slug" character varying(120) NOT NULL
);

-- TABLE: subcaste_aliases
CREATE TABLE IF NOT EXISTS "subcaste_aliases" (
  "id" integer NOT NULL DEFAULT nextval('subcaste_aliases_id_seq'::regclass),
  "subcaste_id" integer NOT NULL,
  "alias" character varying(100) NOT NULL,
  "normalized_alias" character varying(100) NOT NULL
);

-- TABLE: subcastes
CREATE TABLE IF NOT EXISTS "subcastes" (
  "id" integer NOT NULL DEFAULT nextval('subcastes_id_seq'::regclass),
  "community_id" integer NOT NULL,
  "name" character varying(100) NOT NULL
);

-- TABLE: subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "plan_id" uuid NOT NULL,
  "payment_id" uuid,
  "status" USER-DEFINED NOT NULL DEFAULT 'active'::subscription_status,
  "starts_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "cancelled_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: unlocked_contacts
CREATE TABLE IF NOT EXISTS "unlocked_contacts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "unlocker_profile_id" uuid NOT NULL,
  "unlocked_profile_id" uuid NOT NULL,
  "payment_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- TABLE: user_settings
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "hide_profile" boolean NOT NULL DEFAULT false,
  "profile_visibility" character varying(20) NOT NULL DEFAULT 'all'::character varying,
  "show_last_seen" boolean NOT NULL DEFAULT true,
  "notify_email" boolean NOT NULL DEFAULT true,
  "notify_sms" boolean NOT NULL DEFAULT true,
  "notify_push" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "hide_phone" boolean NOT NULL DEFAULT false,
  "photo_blur" character varying(20) NOT NULL DEFAULT 'always'::character varying,
  "hide_from_users" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "hide_from_cities" jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- TABLE: users
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "phone" character varying(15) NOT NULL,
  "is_phone_verified" boolean NOT NULL DEFAULT false,
  "consent_accepted" boolean NOT NULL DEFAULT false,
  "consent_timestamp" timestamp with time zone,
  "referred_by" character varying(50),
  "role" USER-DEFINED NOT NULL DEFAULT 'member'::user_role,
  "status" USER-DEFINED NOT NULL DEFAULT 'active'::user_status,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "refresh_token_hash" character varying(64)
);

-- TABLE: verifications
CREATE TABLE IF NOT EXISTS "verifications" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL,
  "method" USER-DEFINED NOT NULL,
  "selfie_s3_key" character varying(500),
  "govt_id_type" USER-DEFINED,
  "govt_id_s3_key" character varying(500),
  "status" USER-DEFINED NOT NULL DEFAULT 'pending'::verification_status,
  "rejection_reason" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

