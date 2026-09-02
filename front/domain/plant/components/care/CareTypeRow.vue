<script setup lang="ts">
import type { CareType } from '#gql/default';

// One care type's row: its icon and name, and — when the owner tracks it — the
// interval, its due-state, and the mark-done / edit / stop actions. When it is
// not tracked, a single button to start tracking it. Purely presentational; the
// section above owns the data and the dialog.
const { meta, schedule = undefined } = defineProps<{
  meta: CareTypeMeta;
  schedule?: CareSchedule;
}>();

const emit = defineEmits<{
  configure: [type: CareType];
  done: [type: CareType];
  remove: [type: CareType];
}>();

const { locale } = useNuxtApp().$i18n;

const label = computed((): string => `plant.care.type.${meta.type}`);
const isTracked = computed((): boolean => schedule !== undefined);

const status = computed((): CareStatus | null =>
  schedule === undefined ? null : useCareStatus(schedule),
);

const dotClass = computed((): string => {
  if (status.value === null) {
    return '';
  }
  if (status.value.level === 'overdue') {
    return 'bg-red-500';
  }
  if (status.value.level === 'dueToday') {
    return 'bg-amber-400';
  }
  return 'bg-green-500';
});

const lastDoneLabel = computed((): string | null =>
  schedule?.lastDoneOn == null
    ? null
    : new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
        new Date(`${schedule.lastDoneOn}T00:00:00`),
      ),
);
</script>

<template>
  <div class="border-default/60 flex flex-col gap-3 rounded-xl border p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <span
          class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg"
          aria-hidden="true"
        >
          <UIcon :name="meta.icon" class="size-5" />
        </span>
        <div class="min-w-0">
          <p class="text-highlighted text-sm font-medium">{{ $t(label) }}</p>
          <p v-if="isTracked && schedule" class="text-dimmed text-xs">
            {{
              $t(
                'plant.care.every',
                { count: schedule.intervalDays },
                { plural: schedule.intervalDays },
              )
            }}
          </p>
          <p v-else class="text-dimmed text-xs">{{ $t('plant.care.notTracked') }}</p>
        </div>
      </div>

      <UButton
        v-if="!isTracked"
        size="xs"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        @click="emit('configure', meta.type)"
      >
        {{ $t('plant.care.add') }}
      </UButton>
    </div>

    <template v-if="isTracked && schedule && status">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="inline-flex items-center gap-1.5 text-xs font-medium">
          <span class="size-2 shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />
          <span class="text-muted">
            {{ $t(status.labelKey, { count: status.count }, { plural: status.count }) }}
          </span>
        </span>
        <span v-if="lastDoneLabel" class="text-dimmed text-xs">
          {{ $t('plant.care.lastDone') }} {{ lastDoneLabel }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton size="xs" color="primary" icon="i-lucide-check" @click="emit('done', meta.type)">
          {{ $t('plant.care.markDone') }}
        </UButton>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-pencil"
          :aria-label="$t('plant.care.edit')"
          @click="emit('configure', meta.type)"
        >
          {{ $t('plant.care.edit') }}
        </UButton>
        <UButton
          size="xs"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          :aria-label="$t('plant.care.remove')"
          @click="emit('remove', meta.type)"
        >
          {{ $t('plant.care.remove') }}
        </UButton>
      </div>
    </template>
  </div>
</template>
