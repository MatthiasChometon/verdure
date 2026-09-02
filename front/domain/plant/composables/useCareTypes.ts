import { CareType } from '#gql/default';

// The presentation metadata for each care type, in the order the detail page
// lists them: its icon and the interval it suggests when the owner first turns it
// on. The wording lives in i18n under `plant.care.type.<TYPE>` — a static key per
// type, never a key built from a variable.
export type CareTypeMeta = {
  type: CareType;
  icon: string;
  defaultIntervalDays: number;
};

export const useCareTypes = (): { careTypes: CareTypeMeta[] } => ({
  careTypes: [
    { type: CareType.FERTILIZING, icon: 'i-lucide-flask-conical', defaultIntervalDays: 30 },
    { type: CareType.MISTING, icon: 'i-lucide-spray-can', defaultIntervalDays: 3 },
    { type: CareType.ROTATING, icon: 'i-lucide-rotate-cw', defaultIntervalDays: 14 },
    { type: CareType.REPOTTING, icon: 'i-lucide-shovel', defaultIntervalDays: 365 },
  ],
});
