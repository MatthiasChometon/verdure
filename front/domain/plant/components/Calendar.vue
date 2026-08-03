<script setup lang="ts">
const { locale } = useNuxtApp().$i18n;

const iso = (date: Date): string => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const cursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

const monthLabel = computed((): string =>
  new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(cursor.value),
);
const weekdayLabels = computed((): string[] =>
  // 2024-01-01 is a Monday: build a Monday-first list of short weekday names.
  Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(
      new Date(2024, 0, 1 + index),
    ),
  ),
);

type Day = { iso: string; day: number; inMonth: boolean; isToday: boolean };

const days = computed((): Day[] => {
  const first = cursor.value;
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const today = iso(new Date());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const dayIso = iso(date);
    return {
      iso: dayIso,
      day: date.getDate(),
      inMonth: date.getMonth() === first.getMonth(),
      isToday: dayIso === today,
    };
  });
});

const rangeFrom = computed((): string => days.value[0]!.iso);
const rangeTo = computed((): string => days.value[41]!.iso);

const shiftMonth = (delta: number): void => {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1);
};

const {
  data: eventsData,
  error,
  refresh: refreshEvents,
} = useQuery(
  'watering-events',
  () => GqlWateringEvents({ from: rangeFrom.value, to: rangeTo.value }),
  { server: false, immediate: true, watch: [rangeFrom, rangeTo] },
);
const events = computed(() => eventsData.value?.wateringEvents ?? []);

const { data: plantsData, refresh: refreshPlants } = useQuery(
  'watering-plants',
  () => GqlPlants({ ...usePlantSort('watering'), limit: 50 }),
  { server: false, immediate: true },
);
const plants = computed(() => plantsData.value?.plants.items ?? []);

const eventsOn = (day: string): typeof events.value =>
  events.value.filter((event) => event.wateredOn === day);

const addDaysIso = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Interval of the season a due date falls in (April–September = summer),
// mirroring the back's WateringScheduleService.
const seasonInterval = (
  isoDate: string,
  summer: number | undefined,
  winter: number | undefined,
): number | undefined => {
  const month = Number(isoDate.slice(5, 7));
  return month >= 4 && month <= 9 ? summer : winter;
};

// Project each plant's recurring due dates across the visible range, not just
// the single next one — a plant watered every N days shows on every occurrence.
const dueByDay = computed((): Map<string, typeof plants.value> => {
  const map = new Map<string, typeof plants.value>();
  for (const plant of plants.value) {
    let due: string | undefined = plant.nextDueOn ?? undefined;
    // Cap iterations so a zero/negative interval can never loop forever.
    for (let guard = 0; due !== undefined && due <= rangeTo.value && guard < 400; guard += 1) {
      if (due >= rangeFrom.value) {
        const list = map.get(due) ?? [];
        list.push(plant);
        map.set(due, list);
      }
      const interval = seasonInterval(
        due,
        plant.wateringIntervalSummerDays ?? undefined,
        plant.wateringIntervalWinterDays ?? undefined,
      );
      if (interval === undefined || interval <= 0) {
        break;
      }
      due = addDaysIso(due, interval);
    }
  }
  return map;
});

const dueOn = (day: string): typeof plants.value => dueByDay.value.get(day) ?? [];

const refresh = async (): Promise<void> => {
  await Promise.all([refreshEvents(), refreshPlants()]);
};

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

const logWatering = async (): Promise<void> => {
  const day = openDay.value;
  const plantId = selectedPlantId.value;
  if (day === null || plantId === undefined || isFutureDay.value) {
    return;
  }
  const plantName = plants.value.find((plant) => plant.id === plantId)?.name ?? '';
  // Optimistic: show the watering on the day at once, roll back if it fails.
  const ok = await optimisticUpdate(
    eventsData,
    (current) =>
      current === undefined
        ? current
        : {
            ...current,
            wateringEvents: [
              ...current.wateringEvents,
              { id: `optimistic-${Date.now()}`, plantId, plantName, wateredOn: day },
            ],
          },
    () => GqlWaterPlant({ input: { plantId, wateredOn: day } }),
  );
  selectedPlantId.value = undefined;
  if (ok) {
    // Reconcile the real event id and the recomputed due markers.
    await refresh();
  }
};

const removeEvent = async (id: string): Promise<void> => {
  // Optimistic: drop the watering from the list immediately, restore on failure.
  const ok = await optimisticUpdate(
    eventsData,
    (current) =>
      current === undefined
        ? current
        : {
            ...current,
            wateringEvents: current.wateringEvents.filter((event) => event.id !== id),
          },
    () => GqlDeleteWateringEvent({ id }),
  );
  if (ok) {
    await refreshPlants();
  }
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
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-triangle-alert"
      :title="$t('plant.calendar.error')"
    />

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
              @click="logWatering"
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
