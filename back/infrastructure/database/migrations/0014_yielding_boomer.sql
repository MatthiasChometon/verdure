DROP INDEX "watering_event_plant_idx";--> statement-breakpoint
-- Collapse any pre-existing same-day duplicates before enforcing uniqueness,
-- keeping the earliest event per (plant, day).
DELETE FROM "watering_event" a
USING "watering_event" b
WHERE a.plant_id = b.plant_id
  AND a.watered_on = b.watered_on
  AND (a.created_at > b.created_at
    OR (a.created_at = b.created_at AND a.id > b.id));--> statement-breakpoint
CREATE UNIQUE INDEX "watering_event_plant_day_unique" ON "watering_event" USING btree ("plant_id","watered_on");