import { CareType } from '#gql/default';

// One literal i18n key per type (the scanner only checks static keys), so the label
// is a function: it reads the current locale each time it is called.
export type CareTypeMeta = {
  type: CareType;
  icon: string;
  defaultIntervalDays: number;
  label: () => string;
};

export const useCareTypes = (): { careTypes: CareTypeMeta[] } => {
  const { t } = useNuxtApp().$i18n;
  return {
    careTypes: [
      {
        type: CareType.FERTILIZING,
        icon: 'i-lucide-flask-conical',
        defaultIntervalDays: 30,
        label: (): string => t('plant.care.type.FERTILIZING'),
      },
      {
        type: CareType.MISTING,
        icon: 'i-lucide-spray-can',
        defaultIntervalDays: 3,
        label: (): string => t('plant.care.type.MISTING'),
      },
      {
        type: CareType.ROTATING,
        icon: 'i-lucide-rotate-cw',
        defaultIntervalDays: 14,
        label: (): string => t('plant.care.type.ROTATING'),
      },
      {
        type: CareType.REPOTTING,
        icon: 'i-lucide-shovel',
        defaultIntervalDays: 365,
        label: (): string => t('plant.care.type.REPOTTING'),
      },
    ],
  };
};
