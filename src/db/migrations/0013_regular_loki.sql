CREATE TYPE "public"."schedule_item_type" AS ENUM('keynote', 'workshop', 'meal', 'deadline', 'other');--> statement-breakpoint
CREATE TABLE "event_schedule_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "schedule_item_type" DEFAULT 'other' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp,
	"location" text,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_schedule_items" ADD CONSTRAINT "event_schedule_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_schedule_event_idx" ON "event_schedule_items" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_schedule_starts_idx" ON "event_schedule_items" USING btree ("starts_at");