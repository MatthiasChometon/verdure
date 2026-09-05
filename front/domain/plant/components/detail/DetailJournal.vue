<script setup lang="ts">
const { plantId } = defineProps<{ plantId: string }>();

const { entries, photos, isLoaded, hasError, isAdding, addFailed, refresh, addEntry, removeEntry } =
  usePlantJournal(() => plantId);

// Remounting the form on a successful add resets its fields; leaving the key
// untouched on failure keeps what was typed.
const formKey = ref(0);

const onSubmit = async (entry: NewJournalEntry): Promise<void> => {
  const ok = await addEntry(entry);
  if (ok) {
    formKey.value += 1;
  }
};
</script>

<template>
  <section aria-labelledby="journal-title" class="flex flex-col gap-4">
    <h2 id="journal-title" class="text-highlighted text-lg font-semibold">
      {{ $t('plant.journal.title') }}
    </h2>
    <p class="text-muted -mt-2 text-sm">{{ $t('plant.journal.subtitle') }}</p>

    <PlantDetailJournalForm
      :key="formKey"
      :submitting="isAdding"
      :has-error="addFailed"
      @submit="onSubmit"
    />

    <div v-if="hasError" class="flex flex-col items-start gap-3">
      <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="$t('plant.journal.loadError')"
        class="w-full"
      />
      <UButton color="neutral" variant="soft" icon="i-lucide-rotate-cw" @click="refresh()">
        {{ $t('plant.retry') }}
      </UButton>
    </div>

    <div v-else-if="!isLoaded" class="flex flex-col gap-2" aria-hidden="true">
      <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>
      <USkeleton v-for="row in 3" :key="`journal-sk-${row}`" class="h-16 w-full rounded-xl" />
    </div>

    <template v-else>
      <PlantDetailJournalTimeline v-if="photos.length > 0" :entries="photos" />

      <p v-if="entries.length === 0" class="text-dimmed text-sm">
        {{ $t('plant.journal.empty') }}
      </p>
      <ol v-else class="flex flex-col gap-2">
        <PlantDetailJournalEntry
          v-for="entry in entries"
          :key="entry.id"
          :entry="entry"
          @delete="removeEntry"
        />
      </ol>
    </template>
  </section>
</template>
