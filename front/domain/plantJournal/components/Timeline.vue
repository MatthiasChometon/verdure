<script setup lang="ts">
// Parent passes photo entries newest-first (as queried); reverse to chronological.
const { entries } = defineProps<{ entries: PhotoEntry[] }>();

const { locale } = useNuxtApp().$i18n;

const chronological = computed((): PhotoEntry[] => [...entries].reverse());

// An instant shown as a day: always the Paris day, whatever the machine zone.
const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso));
</script>

<template>
  <section aria-labelledby="journal-timeline-title" class="flex flex-col gap-3">
    <h3 id="journal-timeline-title" class="text-highlighted text-sm font-semibold">
      {{ $t('plant.journal.timelineTitle') }}
    </h3>

    <ol class="flex snap-x gap-4 overflow-x-auto pb-2">
      <li
        v-for="entry in chronological"
        :key="entry.id"
        class="flex w-32 shrink-0 snap-start flex-col gap-1.5"
      >
        <img
          :src="entry.imageUrl"
          :alt="$t('plant.journal.photoAlt')"
          loading="lazy"
          decoding="async"
          class="bg-elevated h-32 w-32 rounded-xl object-cover"
        />
        <time :datetime="entry.createdAt" class="text-dimmed text-center text-xs">
          {{ formatDate(entry.createdAt) }}
        </time>
      </li>
    </ol>
  </section>
</template>
