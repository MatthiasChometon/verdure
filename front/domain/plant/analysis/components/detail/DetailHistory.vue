<script setup lang="ts">
// The plant's watering journal: its past waterings, most recent first (the back
// already orders them). A dated, readable list — the seed of the future journal.
const { events } = defineProps<{ events: WateringHistoryEntry[] }>();

const { locale } = useNuxtApp().$i18n;

// One formatter for the whole list: building an Intl.DateTimeFormat per row is the costly part.
const formatter = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }));
const formatDate = (iso: string): string => formatter.value.format(new Date(`${iso}T00:00:00`));

const eventCount = computed((): number => events.length);
const shownCount = useProgressiveCount(eventCount, { initial: 6, step: 6 });
const shownEvents = computed(() => events.slice(0, shownCount.value));
</script>

<template>
  <section aria-labelledby="watering-history-title" class="flex flex-col gap-4">
    <h2 id="watering-history-title" class="text-highlighted text-lg font-semibold">
      {{ $t('plant.detail.historyTitle') }}
    </h2>

    <p v-if="events.length === 0" class="text-dimmed text-sm">
      {{ $t('plant.detail.historyEmpty') }}
    </p>

    <ol v-else class="flex flex-col gap-2">
      <li
        v-for="event in shownEvents"
        :key="event.id"
        class="border-default/60 bg-elevated/30 flex items-center gap-3 rounded-xl border px-4 py-3"
      >
        <UIcon name="i-lucide-droplet" class="text-primary size-4 shrink-0" aria-hidden="true" />
        <time :datetime="event.wateredOn" class="text-highlighted text-sm">
          {{ formatDate(event.wateredOn) }}
        </time>
      </li>
    </ol>
  </section>
</template>
