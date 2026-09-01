<script setup lang="ts">
// Scope the calendar to a single plant (detail page) when `plantId` is given;
// without it, it covers the whole collection (calendar page).
const { plantId = undefined } = defineProps<{ plantId?: string }>();

const { locale } = useNuxtApp().$i18n;

const { days, weekdayLabels, monthLabel, rangeFrom, rangeTo, iso, shiftMonth } = useCalendarMonth();
const { plants, isLoaded, hasError, eventsOn, dueOn, logWatering, removeEvent } =
  useWateringCalendar(rangeFrom, rangeTo, () => plantId);

const openDay = ref<string | null>(null);
const selectedPlantId = ref<string | undefined>(undefined);

// Start every day's popup with an empty picker (never a stale selection carried
// over from the previously opened day).
watch(openDay, () => {
  selectedPlantId.value = undefined;
});

const dayDialog = computed({
  get: (): boolean => openDay.value !== null,
  set: (open: boolean): void => {
    if (!open) {
      openDay.value = null;
    }
  },
});

// A watering can only be logged once its day has arrived (today or earlier).
const isFutureDay = computed(
  (): boolean => openDay.value !== null && openDay.value > iso(new Date()),
);

const dayLabel = computed((): string =>
  openDay.value === null
    ? ''
    : new Intl.DateTimeFormat(locale.value, { dateStyle: 'full' }).format(
        new Date(`${openDay.value}T00:00:00`),
      ),
);

// `description` shows the species under the name in the picker (Nuxt UI item).
const plantItems = computed((): (SelectItem<string> & { description: string })[] =>
  plants.value.map((plant) => ({
    label: plant.name,
    description: plant.species,
    value: plant.id,
  })),
);

const onLogWatering = async (explicitPlantId?: string): Promise<void> => {
  const day = openDay.value;
  const targetId = explicitPlantId ?? selectedPlantId.value;
  if (day === null || targetId === undefined || isFutureDay.value) {
    return;
  }
  const plantName = plants.value.find((plant) => plant.id === targetId)?.name ?? '';
  selectedPlantId.value = undefined;
  await logWatering(day, targetId, plantName);
};
</script>

<template>
  <section>
    <header class="mb-4 flex items-center justify-between">
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        :aria-label="$t('plant.calendar.previous')"
        @click="shiftMonth(-1)"
      />
      <h2 class="text-highlighted text-lg font-semibold capitalize">{{ monthLabel }}</h2>
      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="ghost"
        :aria-label="$t('plant.calendar.next')"
        @click="shiftMonth(1)"
      />
    </header>

    <UAlert
      v-if="hasError"
      color="error"
      variant="soft"
      icon="i-lucide-triangle-alert"
      :title="$t('plant.calendar.error')"
    />

    <div v-else-if="!isLoaded" class="grid grid-cols-7 gap-px" aria-hidden="true">
      <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>
      <USkeleton v-for="weekday in 7" :key="`sk-weekday-${weekday}`" class="mx-auto my-1 h-4 w-8" />
      <USkeleton
        v-for="cell in 42"
        :key="`sk-cell-${cell}`"
        class="min-h-14 rounded-lg sm:min-h-20"
      />
    </div>

    <div v-else class="grid grid-cols-7 gap-px">
      <div
        v-for="label in weekdayLabels"
        :key="label"
        class="text-dimmed py-1 text-center text-xs font-medium capitalize"
      >
        {{ label }}
      </div>

      <button
        v-for="cell in days"
        :key="cell.iso"
        type="button"
        class="border-default/50 hover:border-primary focus-visible:border-primary flex min-h-14 flex-col gap-1 rounded-lg border p-1 text-left transition-colors sm:min-h-20 sm:p-1.5"
        :class="[
          cell.inMonth ? 'bg-elevated/30' : 'opacity-40',
          cell.isToday ? 'ring-primary ring-2' : '',
        ]"
        @click="openDay = cell.iso"
      >
        <span class="text-muted text-xs" :class="cell.isToday ? 'text-primary font-bold' : ''">
          {{ cell.day }}
        </span>

        <!-- Compact dots on phones (full names would not fit 7 columns). -->
        <div class="flex flex-wrap gap-0.5 sm:hidden">
          <span
            v-for="event in eventsOn(cell.iso)"
            :key="event.id"
            class="size-1.5 rounded-full bg-green-500"
            aria-hidden="true"
          />
          <span
            v-for="plant in dueOn(cell.iso)"
            :key="plant.id"
            class="size-1.5 rounded-full bg-amber-500"
            aria-hidden="true"
          />
        </div>

        <span
          v-for="event in eventsOn(cell.iso)"
          :key="`event-${event.id}`"
          class="hidden items-center gap-1 truncate rounded bg-green-500/15 px-1 text-[10px] text-green-700 sm:flex dark:text-green-400"
        >
          <UIcon name="i-lucide-droplet" class="size-2.5 shrink-0" aria-hidden="true" />
          {{ event.plantName }}
        </span>
        <span
          v-for="plant in dueOn(cell.iso)"
          :key="`due-${plant.id}`"
          class="hidden items-center gap-1 truncate rounded bg-amber-500/15 px-1 text-[10px] text-amber-700 sm:flex dark:text-amber-400"
        >
          <UIcon name="i-lucide-alarm-clock" class="size-2.5 shrink-0" aria-hidden="true" />
          {{ plant.name }}
        </span>
      </button>
    </div>

    <UModal v-model:open="dayDialog" :title="dayLabel">
      <template #body>
        <div class="flex flex-col gap-4">
          <div v-if="openDay !== null && eventsOn(openDay).length > 0" class="flex flex-col gap-2">
            <div
              v-for="event in eventsOn(openDay)"
              :key="event.id"
              class="border-default/60 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <span class="flex items-center gap-2 text-sm">
                <UIcon name="i-lucide-droplet" class="text-primary size-4" aria-hidden="true" />
                {{ event.plantName }}
              </span>
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                color="error"
                variant="ghost"
                :aria-label="$t('plant.calendar.deleteEvent')"
                @click="removeEvent(event.id)"
              />
            </div>
          </div>
          <p v-else class="text-dimmed text-sm">{{ $t('plant.calendar.empty') }}</p>

          <p v-if="isFutureDay" class="text-dimmed text-sm">
            {{ $t('plant.calendar.future') }}
          </p>
          <!-- Scoped to one plant: log straight away, no picker to choose from. -->
          <div v-else-if="plantId !== undefined">
            <UButton
              v-if="eventsOn(openDay ?? '').length === 0"
              icon="i-lucide-droplet"
              @click="onLogWatering(plantId)"
            >
              {{ $t('plant.calendar.log') }}
            </UButton>
            <p v-else class="text-dimmed text-sm">{{ $t('plant.calendar.alreadyLogged') }}</p>
          </div>
          <div v-else-if="plantItems.length > 0" class="flex items-end gap-2">
            <USelectMenu
              v-model="selectedPlantId"
              :items="plantItems"
              value-key="value"
              clear
              :placeholder="$t('plant.calendar.pickPlant')"
              class="flex-1"
            />
            <UButton
              icon="i-lucide-droplet"
              :disabled="selectedPlantId === undefined"
              @click="onLogWatering()"
            >
              {{ $t('plant.calendar.log') }}
            </UButton>
          </div>
          <p v-else class="text-dimmed text-sm">{{ $t('plant.calendar.noPlants') }}</p>
        </div>
      </template>
    </UModal>
  </section>
</template>
