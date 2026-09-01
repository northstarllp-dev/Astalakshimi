CREATE TABLE IF NOT EXISTS "communities" (
	"id" serial PRIMARY KEY NOT NULL,
	"religion" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "communities_religion_name_idx" ON "communities" USING btree ("religion","name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "communities_slug_idx" ON "communities" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communities_religion_idx" ON "communities" USING btree ("religion");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"alias" varchar(100) NOT NULL,
	"normalized_alias" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_aliases_normalized_idx" ON "community_aliases" USING btree ("normalized_alias");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "community_aliases_community_normalized_idx" ON "community_aliases" USING btree ("community_id","normalized_alias");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subcastes" (
	"id" serial PRIMARY KEY NOT NULL,
	"community_id" integer NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subcastes_community_name_idx" ON "subcastes" USING btree ("community_id","name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subcastes_community_id_idx" ON "subcastes" USING btree ("community_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subcaste_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"subcaste_id" integer NOT NULL,
	"alias" varchar(100) NOT NULL,
	"normalized_alias" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subcaste_aliases_normalized_idx" ON "subcaste_aliases" USING btree ("normalized_alias");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subcaste_aliases_subcaste_normalized_idx" ON "subcaste_aliases" USING btree ("subcaste_id","normalized_alias");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gotras" (
	"id" serial PRIMARY KEY NOT NULL,
	"religion" varchar(50),
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gotras_name_idx" ON "gotras" USING btree ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gotras_slug_idx" ON "gotras" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gotras_religion_idx" ON "gotras" USING btree ("religion");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gotra_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"gotra_id" integer NOT NULL,
	"alias" varchar(100) NOT NULL,
	"normalized_alias" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gotra_aliases_normalized_idx" ON "gotra_aliases" USING btree ("normalized_alias");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gotra_aliases_gotra_normalized_idx" ON "gotra_aliases" USING btree ("gotra_id","normalized_alias");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_aliases" ADD CONSTRAINT "community_aliases_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subcastes" ADD CONSTRAINT "subcastes_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subcaste_aliases" ADD CONSTRAINT "subcaste_aliases_subcaste_id_subcastes_id_fk" FOREIGN KEY ("subcaste_id") REFERENCES "public"."subcastes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gotra_aliases" ADD CONSTRAINT "gotra_aliases_gotra_id_gotras_id_fk" FOREIGN KEY ("gotra_id") REFERENCES "public"."gotras"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
