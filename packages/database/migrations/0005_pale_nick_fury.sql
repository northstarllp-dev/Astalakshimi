ALTER TABLE "users" ADD COLUMN "refresh_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "profile_photos" ADD COLUMN "blur_data_url" text;