CREATE TYPE "public"."prize_type" AS ENUM('cash', 'voucher', 'product', 'service', 'other');--> statement-breakpoint
CREATE TABLE "challenge_prizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"place" text NOT NULL,
	"value" text NOT NULL,
	"type" "prize_type" DEFAULT 'cash' NOT NULL,
	"num_teams" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge_prizes" ADD CONSTRAINT "challenge_prizes_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenge_prizes_challenge_idx" ON "challenge_prizes" USING btree ("challenge_id");