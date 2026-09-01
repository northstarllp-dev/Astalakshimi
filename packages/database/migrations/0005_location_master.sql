CREATE TABLE IF NOT EXISTS "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"country" varchar(100) DEFAULT 'India' NOT NULL,
	"slug" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "states_name_country_idx" ON "states" USING btree ("name","country");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "states_slug_idx" ON "states" USING btree ("slug");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"state_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"district" varchar(100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cities_state_name_idx" ON "cities" USING btree ("state_id","name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cities_slug_idx" ON "cities" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cities_state_id_idx" ON "cities" USING btree ("state_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "city_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"alias" varchar(100) NOT NULL,
	"normalized_alias" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "city_aliases_normalized_idx" ON "city_aliases" USING btree ("normalized_alias");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "city_aliases_city_normalized_idx" ON "city_aliases" USING btree ("city_id","normalized_alias");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "city_aliases" ADD CONSTRAINT "city_aliases_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
