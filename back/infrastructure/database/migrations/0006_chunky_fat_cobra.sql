CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "plant" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(species, ''))) STORED;--> statement-breakpoint
CREATE INDEX "plant_search_vector_idx" ON "plant" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "plant_name_trgm_idx" ON "plant" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "plant_species_trgm_idx" ON "plant" USING gin ("species" gin_trgm_ops);