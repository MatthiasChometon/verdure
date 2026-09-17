CREATE TABLE "calendar_feed_token" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_feed_token_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "calendar_feed_token_token_unique" UNIQUE("token")
);
