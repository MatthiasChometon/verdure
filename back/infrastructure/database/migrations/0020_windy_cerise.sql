CREATE TABLE "worker_pairing" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"secret_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"user_id" uuid,
	"issued_token" text,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "worker_pairing_code_idx" ON "worker_pairing" USING btree ("code");--> statement-breakpoint
CREATE INDEX "worker_pairing_secret_hash_idx" ON "worker_pairing" USING btree ("secret_hash");