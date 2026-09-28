-- Cashfree-only payments: replace Razorpay/PhonePe provider enum, add session/audit columns.

ALTER TABLE "payments" ALTER COLUMN "provider" DROP DEFAULT;

ALTER TYPE "payment_provider" RENAME TO "payment_provider_old";
CREATE TYPE "payment_provider" AS ENUM ('cashfree');
ALTER TABLE "payments"
  ALTER COLUMN "provider" TYPE "payment_provider"
  USING 'cashfree'::"payment_provider";
DROP TYPE "payment_provider_old";
ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'cashfree';

DO $$ BEGIN
  CREATE TYPE "verified_by" AS ENUM ('client_callback', 'webhook', 'reconciliation');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_session_id" varchar(255);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_status" varchar(50);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "verified_by" "verified_by";
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_metadata" jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_session_id_unique"
  ON "payments" ("provider_session_id");
CREATE INDEX IF NOT EXISTS "idx_payments_status_created"
  ON "payments" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_payments_user_status"
  ON "payments" ("user_id", "status");

CREATE TABLE IF NOT EXISTS "payment_discrepancies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" uuid NOT NULL REFERENCES "payments"("id"),
  "detected_at" timestamptz DEFAULT now() NOT NULL,
  "reason" text NOT NULL,
  "provider_status" varchar(50),
  "expected_amount_paise" integer,
  "actual_amount_paise" integer,
  "payload_snapshot" jsonb,
  "resolved_at" timestamptz,
  "resolved_by" varchar(100)
);

CREATE TABLE IF NOT EXISTS "payment_refunds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" uuid NOT NULL REFERENCES "payments"("id"),
  "refund_id" varchar(100) NOT NULL UNIQUE,
  "cf_refund_id" varchar(100),
  "refund_status" varchar(50),
  "refund_amount_paise" integer NOT NULL,
  "refund_note" text,
  "refund_speed" varchar(20),
  "initiated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "initiated_at" timestamptz DEFAULT now() NOT NULL,
  "settled_at" timestamptz
);
