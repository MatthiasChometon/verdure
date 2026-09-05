// Shared by the safety, care-sheet and species-info catalogs.
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
