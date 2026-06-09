CREATE TYPE "public"."notification_type" AS ENUM('mentor_booked', 'session_reminder', 'join_request_received', 'join_request_reviewed', 'admin_broadcast');--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email_on_mentor_booked" boolean DEFAULT true NOT NULL,
	"email_on_session_reminder" boolean DEFAULT true NOT NULL,
	"email_on_join_request" boolean DEFAULT true NOT NULL,
	"email_on_join_reviewed" boolean DEFAULT true NOT NULL,
	"email_on_admin_broadcast" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_id" uuid,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"creator_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"filter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"send_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"recipient_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_broadcasts" ADD CONSTRAINT "scheduled_broadcasts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_broadcasts" ADD CONSTRAINT "scheduled_broadcasts_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "scheduled_broadcasts_event_idx" ON "scheduled_broadcasts" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "scheduled_broadcasts_send_at_idx" ON "scheduled_broadcasts" USING btree ("send_at");