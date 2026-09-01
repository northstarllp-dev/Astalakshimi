CREATE TABLE IF NOT EXISTS "education_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "education_levels_name_idx" ON "education_levels" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "education_levels_display_order_idx" ON "education_levels" USING btree ("display_order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "specializations" (
	"id" serial PRIMARY KEY NOT NULL,
	"education_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "specializations_education_name_idx" ON "specializations" USING btree ("education_id","name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "specializations_education_id_idx" ON "specializations" USING btree ("education_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "education_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"education_id" integer NOT NULL,
	"alias" varchar(100) NOT NULL,
	"normalized_alias" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "education_aliases_normalized_idx" ON "education_aliases" USING btree ("normalized_alias");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "education_aliases_education_normalized_idx" ON "education_aliases" USING btree ("education_id","normalized_alias");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "specializations" ADD CONSTRAINT "specializations_education_id_education_levels_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."education_levels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "education_aliases" ADD CONSTRAINT "education_aliases_education_id_education_levels_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."education_levels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "education_id" integer;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "specialization_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_education_id_education_levels_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."education_levels"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_specialization_id_specializations_id_fk" FOREIGN KEY ("specialization_id") REFERENCES "public"."specializations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
