CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"state_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"district" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "city_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"alias" varchar(100) NOT NULL,
	"normalized_alias" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"country" varchar(100) DEFAULT 'India' NOT NULL,
	"slug" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"education_id" integer NOT NULL,
	"alias" varchar(100) NOT NULL,
	"normalized_alias" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specializations" (
	"id" serial PRIMARY KEY NOT NULL,
	"education_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"sector" varchar(80),
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"alias" varchar(200) NOT NULL,
	"normalized_alias" varchar(200) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "occupation_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"occupation_id" integer NOT NULL,
	"alias" varchar(150) NOT NULL,
	"normalized_alias" varchar(150) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "occupations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"category" varchar(80),
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" serial PRIMARY KEY NOT NULL,
	"religion" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"alias" varchar(100) NOT NULL,
	"normalized_alias" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gotra_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"gotra_id" integer NOT NULL,
	"alias" varchar(100) NOT NULL,
	"normalized_alias" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gotras" (
	"id" serial PRIMARY KEY NOT NULL,
	"religion" varchar(50),
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcaste_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"subcaste_id" integer NOT NULL,
	"alias" varchar(100) NOT NULL,
	"normalized_alias" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcastes" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD COLUMN "refresh_token_hash" varchar(64);
EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD COLUMN "education_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD COLUMN "specialization_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD COLUMN "occupation_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD COLUMN "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_photos" ADD COLUMN "blur_data_url" text;
EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD COLUMN "target_profile_id" uuid;
EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_aliases" ADD CONSTRAINT "city_aliases_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_aliases" ADD CONSTRAINT "education_aliases_education_id_education_levels_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."education_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specializations" ADD CONSTRAINT "specializations_education_id_education_levels_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."education_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD CONSTRAINT "company_aliases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occupation_aliases" ADD CONSTRAINT "occupation_aliases_occupation_id_occupations_id_fk" FOREIGN KEY ("occupation_id") REFERENCES "public"."occupations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_aliases" ADD CONSTRAINT "community_aliases_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gotra_aliases" ADD CONSTRAINT "gotra_aliases_gotra_id_gotras_id_fk" FOREIGN KEY ("gotra_id") REFERENCES "public"."gotras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcaste_aliases" ADD CONSTRAINT "subcaste_aliases_subcaste_id_subcastes_id_fk" FOREIGN KEY ("subcaste_id") REFERENCES "public"."subcastes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcastes" ADD CONSTRAINT "subcastes_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cities_state_name_idx" ON "cities" USING btree ("state_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cities_state_id_idx" ON "cities" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "city_aliases_normalized_idx" ON "city_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "city_aliases_city_normalized_idx" ON "city_aliases" USING btree ("city_id","normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "states_name_country_idx" ON "states" USING btree ("name","country");--> statement-breakpoint
CREATE UNIQUE INDEX "states_slug_idx" ON "states" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "education_aliases_normalized_idx" ON "education_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "education_aliases_education_normalized_idx" ON "education_aliases" USING btree ("education_id","normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "education_levels_name_idx" ON "education_levels" USING btree ("name");--> statement-breakpoint
CREATE INDEX "education_levels_display_order_idx" ON "education_levels" USING btree ("display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "specializations_education_name_idx" ON "specializations" USING btree ("education_id","name");--> statement-breakpoint
CREATE INDEX "specializations_education_id_idx" ON "specializations" USING btree ("education_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_name_idx" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "companies_sector_idx" ON "companies" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "company_aliases_normalized_idx" ON "company_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "company_aliases_company_normalized_idx" ON "company_aliases" USING btree ("company_id","normalized_alias");--> statement-breakpoint
CREATE INDEX "occupation_aliases_normalized_idx" ON "occupation_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "occupation_aliases_occupation_normalized_idx" ON "occupation_aliases" USING btree ("occupation_id","normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "occupations_name_idx" ON "occupations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "occupations_display_order_idx" ON "occupations" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "occupations_category_idx" ON "occupations" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "communities_religion_name_idx" ON "communities" USING btree ("religion","name");--> statement-breakpoint
CREATE UNIQUE INDEX "communities_slug_idx" ON "communities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "communities_religion_idx" ON "communities" USING btree ("religion");--> statement-breakpoint
CREATE INDEX "community_aliases_normalized_idx" ON "community_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "community_aliases_community_normalized_idx" ON "community_aliases" USING btree ("community_id","normalized_alias");--> statement-breakpoint
CREATE INDEX "gotra_aliases_normalized_idx" ON "gotra_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "gotra_aliases_gotra_normalized_idx" ON "gotra_aliases" USING btree ("gotra_id","normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "gotras_name_idx" ON "gotras" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "gotras_slug_idx" ON "gotras" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "gotras_religion_idx" ON "gotras" USING btree ("religion");--> statement-breakpoint
CREATE INDEX "subcaste_aliases_normalized_idx" ON "subcaste_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "subcaste_aliases_subcaste_normalized_idx" ON "subcaste_aliases" USING btree ("subcaste_id","normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "subcastes_community_name_idx" ON "subcastes" USING btree ("community_id","name");--> statement-breakpoint
CREATE INDEX "subcastes_community_id_idx" ON "subcastes" USING btree ("community_id");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_education_id_education_levels_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."education_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_specialization_id_specializations_id_fk" FOREIGN KEY ("specialization_id") REFERENCES "public"."specializations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_occupation_id_occupations_id_fk" FOREIGN KEY ("occupation_id") REFERENCES "public"."occupations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_target_profile_id_profiles_id_fk" FOREIGN KEY ("target_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;