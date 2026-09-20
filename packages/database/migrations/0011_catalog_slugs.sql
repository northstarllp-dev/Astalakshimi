-- Catalog slugs for definitive city / community matching (labels stay on city/caste).
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "city_slug" varchar(120);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "community_slug" varchar(120);
