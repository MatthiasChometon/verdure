<script setup lang="ts">
import type { CareType } from '#gql/default';

// Sets or edits the recurrence (in days) for one care type. The section owns the
// data and the mutation; this dialog only collects the interval and emits it.
const {
  type = null,
  initialInterval = 30,
  saving = false,
} = defineProps<{
  type?: CareType | null;
  initialInterval?: number;
  saving?: boolean;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{ submit: [intervalDays: number] }>();

const { minIntervalDays, maxIntervalDays } = useCareConstraints();

const intervalDays = ref(initialInterval);

// Re-seed the field whenever the dialog opens for a (possibly different) type.
watch(open, (isOpen): void => {
  if (isOpen) {
    intervalDays.value = initialInterval;
  }
});

const title = computed((): string => (type === null ? '' : `plant.care.type.${type}`));

const isValid = computed(
  (): boolean =>
    Number.isInteger(intervalDays.value) &&
    intervalDays.value >= minIntervalDays &&
    intervalDays.value <= maxIntervalDays,
);

const onSubmit = (): void => {
  if (isValid.value) {
    emit('submit', intervalDays.value);
  }
};
</script>

<template>
  <UModal v-model:open="open" :title="title === '' ? '' : $t(title)">
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <p class="text-muted text-sm">{{ $t('plant.care.dialogLead') }}</p>

        <UFormField :label="$t('plant.care.intervalLabel')" :hint="$t('plant.care.days')">
          <UInput
            v-model.number="intervalDays"
            type="number"
            inputmode="numeric"
            enterkeyhint="done"
            :min="minIntervalDays"
            :max="maxIntervalDays"
            class="w-full"
            autofocus
          />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" type="button" @click="open = false">
            {{ $t('plant.care.cancel') }}
          </UButton>
          <UButton type="submit" :loading="saving" :disabled="!isValid">
            {{ $t('plant.care.save') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
