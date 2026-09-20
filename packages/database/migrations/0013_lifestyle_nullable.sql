-- Make lifestyle_interests diet/smoking/alcohol nullable so blank = NULL.
-- Matches the Drizzle schema (lifestyle-interests.ts) and the live RDS state.
-- Idempotent: DROP NOT NULL / DROP DEFAULT are no-ops on already-nullable columns.
ALTER TABLE "lifestyle_interests" ALTER COLUMN "diet" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lifestyle_interests" ALTER COLUMN "smoking" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lifestyle_interests" ALTER COLUMN "smoking" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "lifestyle_interests" ALTER COLUMN "alcohol" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lifestyle_interests" ALTER COLUMN "alcohol" DROP DEFAULT;
