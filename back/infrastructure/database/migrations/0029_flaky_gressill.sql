CREATE TABLE "care_schedule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"plant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"care_type" text NOT NULL,
	"interval_days" integer NOT NULL,
	"last_done_on" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "care_schedule" ADD CONSTRAINT "care_schedule_plant_id_plant_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "care_schedule_plant_type_unique" ON "care_schedule" USING btree ("plant_id","care_type");