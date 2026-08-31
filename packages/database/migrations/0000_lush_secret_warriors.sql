CREATE TYPE "public"."user_role" AS ENUM('member', 'admin', 'moderator');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."company_sector" AS ENUM('Private', 'Govt', 'MNC', 'Startup', 'Business');--> statement-breakpoint
CREATE TYPE "public"."education_level" AS ENUM('Bachelors', 'Masters', 'Doctorate', 'Diploma', 'High School');--> statement-breakpoint
CREATE TYPE "public"."employment_status" AS ENUM('Employed', 'Business Owner', 'Freelancer', 'Not Working');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('Male', 'Female', 'Other');--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce');--> statement-breakpoint
CREATE TYPE "public"."photo_privacy" AS ENUM('blurred', 'accepted', 'visible');--> statement-breakpoint
CREATE TYPE "public"."family_type" AS ENUM('Nuclear', 'Joint', 'Extended');--> statement-breakpoint
CREATE TYPE "public"."family_values" AS ENUM('Traditional', 'Moderate', 'Liberal');--> statement-breakpoint
CREATE TYPE "public"."parent_occupation" AS ENUM('Employed', 'Business', 'Retired', 'Homemaker', 'Passed Away');--> statement-breakpoint
CREATE TYPE "public"."diet" AS ENUM('Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Jain', 'Vegan');--> statement-breakpoint
CREATE TYPE "public"."habit_frequency" AS ENUM('Never', 'Occasionally', 'Regularly', 'Planning to quit');--> statement-breakpoint
CREATE TYPE "public"."manglik_status" AS ENUM('Yes', 'No', 'Don''t Know', 'Both');--> statement-breakpoint
CREATE TYPE "public"."govt_id_type" AS ENUM('Aadhaar', 'PAN card', 'Passport', 'Driving licence', 'Voter ID');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('selfie', 'govt_id');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('idle', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."photo_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(15) NOT NULL,
	"is_phone_verified" boolean DEFAULT false NOT NULL,
	"consent_accepted" boolean DEFAULT false NOT NULL,
	"consent_timestamp" timestamp with time zone,
	"referred_by" varchar(50),
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_for" varchar(20) NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"gender" "gender" NOT NULL,
	"dob" date NOT NULL,
	"marital_status" "marital_status" NOT NULL,
	"has_children" boolean DEFAULT false,
	"children_count" integer DEFAULT 0,
	"children_living_with_me" boolean,
	"height_cm" integer NOT NULL,
	"about_me" text,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"country" varchar(100) DEFAULT 'India' NOT NULL,
	"religion" varchar(50) NOT NULL,
	"caste" varchar(100) NOT NULL,
	"subcaste" varchar(100),
	"gotra" varchar(100),
	"mother_tongue" varchar(50) NOT NULL,
	"education_level" "education_level" NOT NULL,
	"degree" varchar(150) NOT NULL,
	"college_name" varchar(200),
	"employment_status" "employment_status" NOT NULL,
	"profession" varchar(150) NOT NULL,
	"company_name" varchar(150),
	"company_sector" "company_sector",
	"annual_income" varchar(50) NOT NULL,
	"photo_privacy" "photo_privacy" DEFAULT 'blurred' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "family_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"family_values" "family_values" NOT NULL,
	"family_type" "family_type" NOT NULL,
	"father_occupation" "parent_occupation" NOT NULL,
	"mother_occupation" "parent_occupation" NOT NULL,
	"brothers_count" integer DEFAULT 0 NOT NULL,
	"sisters_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_details_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "lifestyle_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"diet" "diet" NOT NULL,
	"smoking" "habit_frequency" DEFAULT 'Never' NOT NULL,
	"alcohol" "habit_frequency" DEFAULT 'Never' NOT NULL,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lifestyle_interests_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "horoscopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"birth_time" varchar(20),
	"birth_place" varchar(100),
	"manglik" "manglik_status" DEFAULT 'Don''t Know' NOT NULL,
	"rashi" varchar(50),
	"nakshatra" varchar(50),
	"horoscope_s3_key" varchar(500),
	"horoscope_file_name" varchar(255),
	"horoscope_file_size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "horoscopes_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"method" "verification_method" NOT NULL,
	"selfie_s3_key" varchar(500),
	"govt_id_type" "govt_id_type",
	"govt_id_s3_key" varchar(500),
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verifications_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "profile_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"s3_key" varchar(500) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "photo_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"pref_age_min" integer DEFAULT 21 NOT NULL,
	"pref_age_max" integer DEFAULT 32 NOT NULL,
	"pref_height_min_cm" integer DEFAULT 140 NOT NULL,
	"pref_height_max_cm" integer DEFAULT 200 NOT NULL,
	"pref_marital_statuses" jsonb DEFAULT '["Never Married"]'::jsonb NOT NULL,
	"pref_religions" jsonb DEFAULT '["Hindu"]'::jsonb NOT NULL,
	"pref_castes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pref_mother_tongues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pref_min_education" varchar(50),
	"pref_acceptable_incomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pref_locations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_preferences_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_details" ADD CONSTRAINT "family_details_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifestyle_interests" ADD CONSTRAINT "lifestyle_interests_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horoscopes" ADD CONSTRAINT "horoscopes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_preferences" ADD CONSTRAINT "partner_preferences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profiles_search_idx" ON "profiles" USING btree ("gender","religion","caste","city");--> statement-breakpoint
CREATE INDEX "profiles_dob_idx" ON "profiles" USING btree ("dob");--> statement-breakpoint
CREATE INDEX "profile_photos_profile_idx" ON "profile_photos" USING btree ("profile_id","display_order");