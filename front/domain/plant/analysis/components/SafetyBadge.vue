<script setup lang="ts">
import { PlantSafetyLevel } from '#gql/default';

const { safety } = defineProps<{ safety: PlantSafety }>();

const { t } = useNuxtApp().$i18n;

// Never colour alone: each level carries its own icon and its own words, so the
// meaning survives colour-blindness, greyscale and dark mode alike.
type Descriptor = { icon: string; labelKey: string; pill: string };

const descriptors: Record<PlantSafetyLevel, Descriptor> = {
  [PlantSafetyLevel.TOXIC]: {
    icon: 'i-lucide-triangle-alert',
    labelKey: 'plant.safety.toxic',
    pill: 'bg-red-500/10 text-red-700 dark:text-red-300',
  },
  [PlantSafetyLevel.SAFE]: {
    icon: 'i-lucide-shield-check',
    labelKey: 'plant.safety.safe',
    pill: 'bg-green-600/10 text-green-700 dark:text-green-300',
  },
  [PlantSafetyLevel.UNKNOWN]: {
    icon: 'i-lucide-help-circle',
    labelKey: 'plant.safety.unknown',
    pill: 'bg-elevated text-muted',
  },
};

const descriptor = computed((): Descriptor => descriptors[safety.level]);
const label = computed((): string => t(descriptor.value.labelKey));

// The note enriches the badge for everyone: a hover tooltip for sighted users,
// and folded into the accessible name so a screen reader hears the reason too.
const accessibleName = computed((): string =>
  safety.note ? `${label.value} — ${safety.note}` : label.value,
);
</script>

<template>
  <span
    class="inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
    :class="descriptor.pill"
    :aria-label="accessibleName"
    :title="safety.note ?? undefined"
  >
    <UIcon :name="descriptor.icon" class="size-3.5 shrink-0" aria-hidden="true" />
    <span>{{ label }}</span>
  </span>
</template>
