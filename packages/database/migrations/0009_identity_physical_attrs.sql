ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "weight_kg" integer;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "complexion" varchar(50);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "disability" text;
