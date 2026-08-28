ALTER TABLE "recognition_job" ALTER COLUMN "image_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recognition_job" ADD COLUMN "kind" text DEFAULT 'identify' NOT NULL;--> statement-breakpoint
ALTER TABLE "recognition_job" ADD COLUMN "input_text" text;--> statement-breakpoint
ALTER TABLE "recognition_job" ADD COLUMN "embedding" real[];--> statement-breakpoint
ALTER TABLE "recognition_job" ADD COLUMN "plant_id" uuid;