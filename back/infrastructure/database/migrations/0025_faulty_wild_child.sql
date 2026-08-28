CREATE TABLE "plantnet_shared_usage" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "plantnet_shared_usage_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "recognition_job" ADD COLUMN "fail_reason" text;