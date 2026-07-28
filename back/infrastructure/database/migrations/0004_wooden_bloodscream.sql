CREATE TABLE "species" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gbif_key" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "species_gbif_key_unique" UNIQUE("gbif_key"),
	CONSTRAINT "species_name_unique" UNIQUE("name")
);
