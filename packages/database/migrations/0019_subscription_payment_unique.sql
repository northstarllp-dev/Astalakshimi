-- One subscription row per captured payment (null payment_id remains allowed for complimentary plans).
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_payment_id_unique"
  ON "subscriptions" ("payment_id")
  WHERE "payment_id" IS NOT NULL;
