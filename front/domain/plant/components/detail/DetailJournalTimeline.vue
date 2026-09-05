<script setup lang="ts">
// Parent passes photo entries newest-first (as queried); reverse to chronological.
const { entries } = defineProps<{ entries: JournalEntry[] }>();

const { locale } = useNuxtApp().$i18n;

const chronological = computed((): JournalEntry[] => [...entries].reverse());

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );
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
          :src="entry.imageUrl ?? ''"
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
