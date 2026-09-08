ALTER TABLE "profile_photos" ADD COLUMN "content_hash" varchar(64);
--> statement-breakpoint
CREATE INDEX "profile_photos_content_hash_idx" ON "profile_photos" ("profile_id","content_hash");
