// Localised text pair (fr/en) shared by the safety, care-sheet and species-info
// catalogs — the front stays a pure consumer, the same way it is for
// suggestPlantName's `lang` argument.
export type Localised = { fr: string; en: string };

// A plant row as read by the list/save queries, before PlantMapper derives
// nextDueOn/winterRest from its watering rhythm.
export type PlantRow = {
  id: string;
  name: string;
  species: string;
  description: string | null;
  imageKey: string | null;
  wateringIntervalSummerDays: number | null;
  wateringIntervalWinterDays: number | null;
  lastWateredOn: string | null;
};
