<script setup lang="ts">
const { species } = defineProps<{ species: string }>();

const summerDays = defineModel<number | null>('summerDays', { required: true });
const winterDays = defineModel<number | null>('winterDays', { required: true });
const lastWateredOn = defineModel<string | null>('lastWateredOn', { required: true });

const today = todayIso();

const tracked = computed({
  get: (): boolean => summerDays.value !== null || winterDays.value !== null,
  set: (on: boolean): void => {
    summerDays.value = on ? 7 : null;
    winterDays.value = on ? 14 : null;
    lastWateredOn.value = on ? today : null;
  },
});

// Pre-fill the seasonal intervals from the curated defaults for the species'
// genus, enabling tracking if it was off.
const suggesting = ref(false);
// Flips the button to a confirmation after a successful suggestion, and keeps it
// there until the user edits the intervals themselves (noticeable even when
// tracking was already on).
const suggested = ref(false);
// True only during the programmatic fill, so its own writes don't clear the
// confirmation via the watcher below.
let applying = false;

const suggest = async (): Promise<void> => {
  if (species === '') {
    return;
  }
  suggesting.value = true;
  try {
    const { wateringDefault } = await GqlWateringDefault({ species });
    applying = true;
    summerDays.value = wateringDefault.summerDays;
    winterDays.value = wateringDefault.winterDays;
    if (lastWateredOn.value === null) {
      lastWateredOn.value = today;
    }
    suggested.value = true;
    void nextTick((): void => {
      applying = false;
    });
  } finally {
    suggesting.value = false;
  }
};

// Drop the confirmation as soon as the user changes an interval themselves.
watch([summerDays, winterDays], (): void => {
  if (!applying) {
    suggested.value = false;
  }
});

// UInput's model is string; map the nullable date to/from an empty string.
const lastWateredDate = computed({
  get: (): string => lastWateredOn.value ?? '',
  set: (value: string): void => {
    lastWateredOn.value = value === '' ? null : value;
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
      <div class="flex items-center gap-2">
        <UButton
          v-if="species !== ''"
          size="xs"
          color="primary"
          variant="ghost"
          :icon="suggested ? 'i-lucide-check' : 'i-lucide-wand-sparkles'"
          :loading="suggesting"
          @click="suggest"
        >
          {{ suggested ? $t('plant.watering.suggested') : $t('plant.watering.suggest') }}
        </UButton>
        <USwitch v-model="tracked" :aria-label="$t('plant.watering.track')" />
      </div>
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
