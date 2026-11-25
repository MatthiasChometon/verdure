<script setup lang="ts">
const summerDays = defineModel<number | undefined>('summerDays', { required: true });
const winterDays = defineModel<number | undefined>('winterDays', { required: true });
const lastWateredOn = defineModel<string | undefined>('lastWateredOn', { required: true });

const today = useParisDay().todayIso();

const tracked = computed({
  get: (): boolean => summerDays.value !== undefined || winterDays.value !== undefined,
  set: (on: boolean): void => {
    summerDays.value = on ? 7 : undefined;
    winterDays.value = on ? 14 : undefined;
    lastWateredOn.value = on ? today : undefined;
  },
});

// UInput's model is string; map the optional date to/from an empty string.
const lastWateredDate = computed({
  get: (): string => lastWateredOn.value ?? '',
  set: (value: string): void => {
    lastWateredOn.value = value === '' ? undefined : value;
  },
});
</script>

<template>
  <div class="border-default/60 flex flex-col gap-4 rounded-xl border p-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-highlighted text-sm font-medium">{{ $t('plant.watering.track') }}</p>
        <p class="text-dimmed text-xs">{{ $t('plant.watering.trackHint') }}</p>
      </div>
      <USwitch v-model="tracked" :aria-label="$t('plant.watering.track')" />
    </div>

    <div v-if="tracked" class="flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-3">
        <UFormField :label="$t('plant.watering.intervalSummer')" :hint="$t('plant.watering.days')">
          <UInput
            v-model.number="summerDays"
            type="number"
            inputmode="numeric"
            enterkeyhint="next"
            :min="1"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$t('plant.watering.intervalWinter')" :hint="$t('plant.watering.days')">
          <UInput
            v-model.number="winterDays"
            type="number"
            inputmode="numeric"
            enterkeyhint="next"
            :min="1"
            class="w-full"
          />
        </UFormField>
      </div>
      <UFormField :label="$t('plant.watering.lastWateredOn')">
        <UInput v-model="lastWateredDate" type="date" :max="today" class="w-full" />
      </UFormField>
    </div>
  </div>
</template>
