<script setup lang="ts">
import { PlantHumidityNeed, PlantLightNeed } from '#gql/default';

const { careSheet } = defineProps<{ careSheet: PlantCareSheet }>();

const { t } = useNuxtApp().$i18n;

// Each level carries its own icon AND its own words, so the meaning survives
// colour-blindness, greyscale and dark mode — never colour or icon alone.
type Descriptor = { icon: string; labelKey: string };

const lightDescriptors: Record<PlantLightNeed, Descriptor> = {
  [PlantLightNeed.LOW]: { icon: 'i-lucide-cloud', labelKey: 'plant.careSheet.lightLevel.low' },
  [PlantLightNeed.MEDIUM]: { icon: 'i-lucide-cloud-sun', labelKey: 'plant.careSheet.lightLevel.medium' },
  [PlantLightNeed.BRIGHT]: { icon: 'i-lucide-sun', labelKey: 'plant.careSheet.lightLevel.bright' },
};

const humidityDescriptors: Record<PlantHumidityNeed, Descriptor> = {
  [PlantHumidityNeed.LOW]: { icon: 'i-lucide-droplet', labelKey: 'plant.careSheet.humidityLevel.low' },
  [PlantHumidityNeed.MEDIUM]: {
    icon: 'i-lucide-droplets',
    labelKey: 'plant.careSheet.humidityLevel.medium',
  },
  [PlantHumidityNeed.HIGH]: {
    icon: 'i-lucide-cloud-rain',
    labelKey: 'plant.careSheet.humidityLevel.high',
  },
};

type Attribute = { termKey: string; icon: string; value: string };

const attributes = computed((): Attribute[] => {
  const light = lightDescriptors[careSheet.light];
  const humidity = humidityDescriptors[careSheet.humidity];
  return [
    { termKey: 'plant.careSheet.lightLabel', icon: light.icon, value: t(light.labelKey) },
    { termKey: 'plant.careSheet.humidityLabel', icon: humidity.icon, value: t(humidity.labelKey) },
  ];
});
</script>

<template>
  <div class="border-default bg-elevated/40 flex flex-col gap-5 rounded-2xl border p-5">
    <dl class="grid gap-4 sm:grid-cols-2">
      <div v-for="attribute in attributes" :key="attribute.termKey" class="flex items-center gap-3">
        <span
          class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <UIcon :name="attribute.icon" class="size-5" aria-hidden="true" />
        </span>
        <div class="flex min-w-0 flex-col">
          <dt class="text-muted text-xs font-medium">{{ $t(attribute.termKey) }}</dt>
          <dd class="text-highlighted font-medium break-words">{{ attribute.value }}</dd>
        </div>
      </div>
    </dl>

    <div class="text-dimmed flex items-start gap-2.5 text-sm">
      <UIcon
        name="i-lucide-lightbulb"
        class="text-primary mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      />
      <p class="break-words">
        <span class="sr-only">{{ $t('plant.careSheet.tipLabel') }}. </span>{{ careSheet.tip }}
      </p>
    </div>
  </div>
</template>
