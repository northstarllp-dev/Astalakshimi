-- Hide-from-user, hide-from-city, and hide-phone were stored but never applied.
ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "hide_phone";
ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "hide_from_users";
ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "hide_from_cities";
