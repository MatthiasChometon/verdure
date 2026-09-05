import { CareType } from '#gql/default';

// Wording lives in i18n under `plant.care.type.<TYPE>` — a static key per type,
// never built from a variable (i18n key extraction needs literal keys).
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
