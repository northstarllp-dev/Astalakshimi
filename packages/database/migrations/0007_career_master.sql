CREATE TABLE IF NOT EXISTS "occupations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"category" varchar(80),
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "occupations_name_idx" ON "occupations" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "occupations_display_order_idx" ON "occupations" USING btree ("display_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "occupations_category_idx" ON "occupations" USING btree ("category");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "occupation_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"occupation_id" integer NOT NULL,
	"alias" varchar(150) NOT NULL,
	"normalized_alias" varchar(150) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "occupation_aliases_normalized_idx" ON "occupation_aliases" USING btree ("normalized_alias");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "occupation_aliases_occupation_normalized_idx" ON "occupation_aliases" USING btree ("occupation_id","normalized_alias");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"sector" varchar(80),
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "companies_name_idx" ON "companies" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_sector_idx" ON "companies" USING btree ("sector");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"alias" varchar(200) NOT NULL,
	"normalized_alias" varchar(200) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_aliases_normalized_idx" ON "company_aliases" USING btree ("normalized_alias");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_aliases_company_normalized_idx" ON "company_aliases" USING btree ("company_id","normalized_alias");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "occupation_aliases" ADD CONSTRAINT "occupation_aliases_occupation_id_occupations_id_fk" FOREIGN KEY ("occupation_id") REFERENCES "public"."occupations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_aliases" ADD CONSTRAINT "company_aliases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "occupation_id" integer;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "company_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_occupation_id_occupations_id_fk" FOREIGN KEY ("occupation_id") REFERENCES "public"."occupations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
