CREATE TABLE "external_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" text NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text,
	"status" text DEFAULT 'available' NOT NULL,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "external_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "expertise_domain" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "university" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cv_url" text;--> statement-breakpoint
ALTER TABLE "external_tickets" ADD CONSTRAINT "external_tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_tickets" ADD CONSTRAINT "external_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "external_tickets_event_idx" ON "external_tickets" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "external_tickets_user_idx" ON "external_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "external_tickets_status_idx" ON "external_tickets" USING btree ("status");