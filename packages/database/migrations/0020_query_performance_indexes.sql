-- Hot-path indexes for discover, matches, inbox, and notifications.
-- Each one matches a query the API already runs on every page.

CREATE INDEX IF NOT EXISTS "subscriptions_user_status_expires_idx"
  ON "subscriptions" ("user_id", "status", "expires_at");

CREATE INDEX IF NOT EXISTS "interests_sender_status_idx"
  ON "interests" ("sender_profile_id", "status");

CREATE INDEX IF NOT EXISTS "interests_receiver_status_idx"
  ON "interests" ("receiver_profile_id", "status");

CREATE INDEX IF NOT EXISTS "notifications_user_created_idx"
  ON "notifications" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "profile_photos_profile_status_idx"
  ON "profile_photos" ("profile_id", "status");

CREATE INDEX IF NOT EXISTS "profile_photos_primary_exists_idx"
  ON "profile_photos" ("profile_id")
  WHERE "is_primary" = true;

CREATE INDEX IF NOT EXISTS "verifications_verified_profile_idx"
  ON "verifications" ("profile_id")
  WHERE "status" = 'verified';
