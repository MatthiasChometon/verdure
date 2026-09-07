<script setup lang="ts">
const { entry } = defineProps<{ entry: JournalEntry }>();

const emit = defineEmits<{ delete: [id: string] }>();

const { locale } = useNuxtApp().$i18n;
const { metaOf } = useJournalKinds();

const meta = computed((): JournalKindMeta => metaOf(entry.kind));

const formattedDate = computed((): string =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(entry.createdAt)),
);
</script>

<template>
  <li class="border-default/60 bg-elevated/30 flex items-start gap-3 rounded-xl border px-4 py-3">
    <span
      class="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full"
      aria-hidden="true"
    >
      <UIcon :name="meta.icon" class="size-4" />
    </span>

    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span class="text-highlighted text-sm font-medium">{{ meta.label }}</span>
        <time :datetime="entry.createdAt" class="text-dimmed text-xs">{{ formattedDate }}</time>
      </div>

      <p v-if="entry.note" class="text-muted text-sm break-words whitespace-pre-line">
        {{ entry.note }}
      </p>

      <img
        v-if="entry.imageUrl"
        :src="entry.imageUrl"
        :alt="meta.label"
        loading="lazy"
        decoding="async"
        class="bg-elevated max-h-64 w-full max-w-xs rounded-xl object-cover"
      />
    </div>

    <UButton
      icon="i-lucide-trash-2"
      size="xs"
      color="error"
      variant="ghost"
      :aria-label="$t('plant.journal.delete')"
      @click="emit('delete', entry.id)"
    />
  </li>
</template>
