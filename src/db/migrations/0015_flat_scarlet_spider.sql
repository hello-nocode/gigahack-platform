ALTER TABLE "events" ALTER COLUMN "max_challenge_applications" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "applications_open" boolean DEFAULT false NOT NULL;