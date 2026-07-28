CREATE TABLE "nickname" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"genus" text DEFAULT '' NOT NULL,
	"lang" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nickname_unique" UNIQUE("genus","lang","name")
);
--> statement-breakpoint
CREATE INDEX "nickname_lookup_idx" ON "nickname" USING btree ("genus","lang");