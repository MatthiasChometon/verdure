CREATE TABLE "watering_default" (
	"genus" text PRIMARY KEY NOT NULL,
	"summer_days" integer NOT NULL,
	"winter_days" integer NOT NULL
);
--> statement-breakpoint
INSERT INTO "watering_default" ("genus", "summer_days", "winter_days") VALUES
	('monstera', 7, 12),
	('epipremnum', 7, 12),
	('philodendron', 7, 12),
	('scindapsus', 7, 12),
	('ficus', 7, 10),
	('pilea', 6, 12),
	('chlorophytum', 7, 12),
	('spathiphyllum', 5, 8),
	('calathea', 4, 7),
	('maranta', 4, 7),
	('nephrolepis', 3, 6),
	('asplenium', 4, 7),
	('sansevieria', 14, 28),
	('dracaena', 10, 18),
	('zamioculcas', 14, 28),
	('aloe', 14, 28),
	('echeveria', 16, 30),
	('haworthia', 16, 30),
	('crassula', 14, 30),
	('sedum', 16, 30),
	('kalanchoe', 12, 24),
	('opuntia', 16, 30),
	('mammillaria', 16, 30),
	('phalaenopsis', 7, 10),
	('ocimum', 2, 4),
	('mentha', 3, 5),
	('begonia', 5, 9),
	('peperomia', 8, 14),
	('hoya', 10, 18),
	('tradescantia', 5, 9)
ON CONFLICT ("genus") DO NOTHING;
