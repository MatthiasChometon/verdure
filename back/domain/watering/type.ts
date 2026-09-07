export type WateringSeason = 'summer' | 'winter';

// A plant's watering inputs, as needed to decide whether it is due: its last
// watering and its two seasonal intervals (null on both = not tracked).
export type PlantWateringRecord = {
  id: string;
  name: string;
  lastWateredOn: string | null;
  summerDays: number | null;
  winterDays: number | null;
};

// A plant that is due for watering on a given day, with the date it was due.
export type DuePlant = {
  id: string;
  name: string;
  dueOn: string;
};
