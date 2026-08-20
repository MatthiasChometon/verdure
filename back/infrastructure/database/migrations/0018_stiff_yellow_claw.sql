CREATE TABLE "recognition_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"image_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"species" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "recognition_job_claim_idx" ON "recognition_job" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "worker_token_hash_unique" ON "worker_token" USING btree ("token_hash");