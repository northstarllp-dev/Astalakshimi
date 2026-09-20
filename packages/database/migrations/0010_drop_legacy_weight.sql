-- Drop legacy free-text weight column; weightKg (integer) is the canonical column.
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "weight";
