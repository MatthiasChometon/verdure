CREATE TABLE "watering_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"watered_on" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plant" ADD COLUMN "watering_interval_summer_days" integer;--> statement-breakpoint
ALTER TABLE "plant" ADD COLUMN "watering_interval_winter_days" integer;--> statement-breakpoint
ALTER TABLE "watering_event" ADD CONSTRAINT "watering_event_plant_id_plant_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "watering_event_plant_idx" ON "watering_event" USING btree ("plant_id","watered_on");