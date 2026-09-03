<script setup lang="ts">
import { JournalEntryKind } from '#gql/default';

// Collects one new journal entry — a kind, a note, an optional photo — and emits
// it. The parent owns the add (optimistic) and, on success, remounts this form to
// reset it; on failure the fields stay, so a failed add never costs what was typed.
const { submitting = false, hasError = false } = defineProps<{
  submitting?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{ submit: [entry: NewJournalEntry] }>();

const { journalNoteMaxLength } = usePlantConstraints();
const { kinds } = useJournalKinds();

const kind = ref<JournalEntryKind>(JournalEntryKind.NOTE);
const note = ref('');
const file = ref<File | null>(null);

const previewUrl = ref<string | null>(null);
let objectUrl: string | null = null;

const noteCount = computed((): string => `${note.value.length}/${journalNoteMaxLength}`);
const noteAtMax = computed((): boolean => note.value.length >= journalNoteMaxLength);

// A note, a photo, or both — but never an empty entry.
const canSubmit = computed((): boolean => note.value.trim() !== '' || file.value !== null);

const clearPreview = (): void => {
  if (objectUrl !== null) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  previewUrl.value = null;
};

const fileInput = ref<HTMLInputElement | null>(null);

const onPickPhoto = (): void => {
  const selected = fileInput.value?.files?.[0] ?? null;
  clearPreview();
  file.value = selected;
  if (selected !== null) {
    objectUrl = URL.createObjectURL(selected);
    previewUrl.value = objectUrl;
  }
};

const removePhoto = (): void => {
  clearPreview();
  file.value = null;
};

onBeforeUnmount(clearPreview);

const submit = (): void => {
  if (!canSubmit.value || submitting) {
    return;
  }
  emit('submit', { kind: kind.value, note: note.value, file: file.value });
};
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <fieldset class="flex flex-col gap-2">
      <legend class="mb-1 text-sm font-medium">{{ $t('plant.journal.kind') }}</legend>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <UButton
          v-for="option in kinds"
          :key="option.value"
          type="button"
          :icon="option.icon"
          size="sm"
          block
          :variant="kind === option.value ? 'soft' : 'outline'"
          :color="kind === option.value ? 'primary' : 'neutral'"
          :aria-pressed="kind === option.value"
          @click="kind = option.value"
        >
          {{ option.label }}
        </UButton>
      </div>
    </fieldset>

    <UFormField :label="$t('plant.journal.note')">
      <template #hint>
        <span class="text-xs tabular-nums" :class="noteAtMax ? 'text-warning' : 'text-dimmed'">
          {{ noteCount }}
        </span>
      </template>
      <UTextarea
        v-model="note"
        :rows="3"
        :maxlength="journalNoteMaxLength"
        :placeholder="$t('plant.journal.notePlaceholder')"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="$t('plant.journal.photo')" :hint="$t('plant.journal.optional')">
      <div class="flex flex-wrap items-center gap-3">
        <label
          class="border-default text-muted hover:border-primary hover:text-primary flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-sm transition-colors"
        >
          <UIcon name="i-lucide-image-up" class="size-4" aria-hidden="true" />
          {{ file === null ? $t('plant.journal.pickPhoto') : $t('plant.journal.changePhoto') }}
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="sr-only"
            @change="onPickPhoto"
          />
        </label>
        <div v-if="previewUrl !== null" class="flex items-center gap-2">
          <img :src="previewUrl" alt="" class="size-12 rounded-lg object-cover" />
          <UButton
            type="button"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            :aria-label="$t('plant.journal.removePhoto')"
            @click="removePhoto"
          />
        </div>
      </div>
    </UFormField>

    <UAlert
      v-if="hasError"
      color="error"
      variant="soft"
      icon="i-lucide-triangle-alert"
      :title="$t('plant.journal.error')"
    />

    <div class="flex justify-end">
      <UButton type="submit" icon="i-lucide-plus" :loading="submitting" :disabled="!canSubmit">
        {{ $t('plant.journal.add') }}
      </UButton>
    </div>
  </form>
</template>
