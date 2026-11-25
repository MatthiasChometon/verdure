-- Realistic data for the load replica (run once the API has migrated the database):
-- 5 accounts with a full collection each, plus a 6th (the AI worker's operator, empty) (200 plants, 200 waterings per plant), so a read
-- never runs against an empty database. Account ids are fixed: sign-tokens.mjs signs for them.
insert into "user" (id, email, name, google_id, email_verified_at)
select ('00000000-0000-4000-8000-00000000000' || n)::uuid, 'load' || n || '@test.dev', 'load' || n, 'google-load' || n, now()
from generate_series(1, 6) n;

insert into plant (id, user_id, name, species, description, watering_interval_summer_days, watering_interval_winter_days)
select gen_random_uuid(), u.id, 'Plant ' || n, (array['Monstera deliciosa', 'Ficus lyrata', 'Aloe vera', 'Pilea peperomioides'])[1 + n % 4],
  'A seeded plant for the load tests.', 3 + n % 10, 7 + n % 14
from "user" u cross join generate_series(1, 200) n
where u.email like 'load%' and u.email <> 'load6@test.dev';

insert into watering_event (id, plant_id, user_id, watered_on)
select gen_random_uuid(), p.id, p.user_id, current_date - 3 - d
from plant p cross join generate_series(0, 199) d
where p.user_id <> '00000000-0000-4000-8000-000000000006';

analyze plant;
analyze watering_event;
