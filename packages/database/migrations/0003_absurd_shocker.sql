CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile1_id" uuid NOT NULL,
	"profile2_id" uuid NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"blocked_reason" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unlocked_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unlocker_profile_id" uuid NOT NULL,
	"unlocked_profile_id" uuid NOT NULL,
	"payment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "plan_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_profile1_id_profiles_id_fk" FOREIGN KEY ("profile1_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_profile2_id_profiles_id_fk" FOREIGN KEY ("profile2_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocked_contacts" ADD CONSTRAINT "unlocked_contacts_unlocker_profile_id_profiles_id_fk" FOREIGN KEY ("unlocker_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocked_contacts" ADD CONSTRAINT "unlocked_contacts_unlocked_profile_id_profiles_id_fk" FOREIGN KEY ("unlocked_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocked_contacts" ADD CONSTRAINT "unlocked_contacts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_profiles" ADD CONSTRAINT "blocked_profiles_blocker_id_profiles_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_profiles" ADD CONSTRAINT "blocked_profiles_blocked_id_profiles_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_sessions_profiles_idx" ON "chat_sessions" USING btree ("profile1_id","profile2_id");--> statement-breakpoint
CREATE INDEX "unlocked_contacts_profiles_idx" ON "unlocked_contacts" USING btree ("unlocker_profile_id","unlocked_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blocked_profiles_blocker_blocked_idx" ON "blocked_profiles" USING btree ("blocker_id","blocked_id");