CREATE INDEX "auth_token_token_hash_idx" ON "auth_token" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_token_user_type_idx" ON "auth_token" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "plant_user_id_idx" ON "plant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "care_schedule_user_id_idx" ON "care_schedule" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subscription_user_id_idx" ON "push_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "watering_event_user_watered_on_idx" ON "watering_event" USING btree ("user_id","watered_on");