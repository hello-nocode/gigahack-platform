CREATE TYPE "public"."global_role" AS ENUM('user', 'admin');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "global_role" "global_role" DEFAULT 'user' NOT NULL;