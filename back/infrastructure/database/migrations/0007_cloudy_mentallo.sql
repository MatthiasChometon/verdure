ALTER TABLE "plant" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "plant" ADD COLUMN "embedding" real[];--> statement-breakpoint
ALTER TABLE "plant" DROP COLUMN "search_vector";--> statement-breakpoint
ALTER TABLE "plant" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(species, '') || ' ' || coalesce(description, ''))) STORED;--> statement-breakpoint
CREATE INDEX "plant_search_vector_idx" ON "plant" USING gin ("search_vector");--> statement-breakpoint
CREATE OR REPLACE FUNCTION cosine_similarity(a real[], b real[]) RETURNS double precision AS $$
  SELECT coalesce(sum(x::double precision * y::double precision), 0)
  FROM unnest(a, b) AS t(x, y);
$$ LANGUAGE sql IMMUTABLE;
