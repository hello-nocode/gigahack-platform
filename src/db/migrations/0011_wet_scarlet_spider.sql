CREATE TABLE "mentor_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"booked_by" text NOT NULL,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mentor_bookings_slot_id_unique" UNIQUE("slot_id")
);
--> statement-breakpoint
CREATE TABLE "mentor_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"code" text NOT NULL,
	"created_by" text NOT NULL,
	"used_by" text,
	"used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mentor_invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "mentor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_id" uuid NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"bio" text,
	"expertise" text,
	"company" text,
	"linkedin_url" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_profile_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "mentor_slot_duration" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "mentor_bookings" ADD CONSTRAINT "mentor_bookings_slot_id_mentor_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."mentor_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_bookings" ADD CONSTRAINT "mentor_bookings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_bookings" ADD CONSTRAINT "mentor_bookings_booked_by_users_id_fk" FOREIGN KEY ("booked_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_invites" ADD CONSTRAINT "mentor_invites_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_invites" ADD CONSTRAINT "mentor_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_invites" ADD CONSTRAINT "mentor_invites_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_slots" ADD CONSTRAINT "mentor_slots_mentor_profile_id_mentor_profiles_id_fk" FOREIGN KEY ("mentor_profile_id") REFERENCES "public"."mentor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_slots" ADD CONSTRAINT "mentor_slots_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mentor_bookings_slot_idx" ON "mentor_bookings" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "mentor_bookings_team_idx" ON "mentor_bookings" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_profiles_user_event_idx" ON "mentor_profiles" USING btree ("user_id","event_id");--> statement-breakpoint
CREATE INDEX "mentor_profiles_event_idx" ON "mentor_profiles" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "mentor_slots_mentor_idx" ON "mentor_slots" USING btree ("mentor_profile_id");--> statement-breakpoint
CREATE INDEX "mentor_slots_event_idx" ON "mentor_slots" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "mentor_slots_starts_idx" ON "mentor_slots" USING btree ("starts_at");