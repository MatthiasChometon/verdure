<script setup lang="ts">
import type { CareType } from '#gql/default';

const {
  plantName,
  meta,
  schedule = undefined,
} = defineProps<{
  plantName: string;
  meta: CareTypeMeta;
  schedule?: CareSchedule | undefined;
}>();

const emit = defineEmits<{
  configure: [type: CareType];
  done: [type: CareType];
  remove: [type: CareType];
}>();

const { t, locale } = useNuxtApp().$i18n;

const isTracked = computed((): boolean => schedule !== undefined);

const calendarReminder = computed((): RecurringReminder | undefined => {
  const nextDueOn = schedule?.nextDueOn ?? undefined;
  if (schedule === undefined || nextDueOn === undefined) {
    return undefined;
  }
  return {
    title: t('plant.care.calendarTitle', { type: meta.label(), name: plantName }),
    description: t(
      'plant.care.calendarDescription',
      { days: schedule.intervalDays },
      { plural: schedule.intervalDays },
    ),
    startDate: nextDueOn,
    intervalDays: schedule.intervalDays,
  };
});

const status = computed((): CareStatus | undefined =>
  schedule === undefined ? undefined : useCareStatus(schedule),
);

// One literal key per level: the i18n scanner can only check static keys.
const statusLabel = computed((): string => {
  const current = status.value;
  if (current === undefined) {
    return '';
  }
  const named = { count: current.count };
  const options = { plural: current.count };
  switch (current.level) {
    case 'never':
      return t('plant.care.status.never', named, options);
    case 'overdue':
      return t('plant.care.status.overdue', named, options);
    case 'dueToday':
      return t('plant.care.status.dueToday', named, options);
    case 'upcoming':
      return t('plant.care.status.upcoming', named, options);
  }
});

const dotClass = computed((): string => {
  if (status.value === undefined) {
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

// A calendar day, not an instant: formatted in UTC so the machine zone cannot shift it.
const lastDoneLabel = computed((): string | undefined => {
  const lastDoneOn = schedule?.lastDoneOn ?? undefined;
  return lastDoneOn === undefined
    ? undefined
    : new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(`${lastDoneOn}T00:00:00Z`),
      );
});
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
          <p class="text-highlighted text-sm font-medium">{{ meta.label() }}</p>
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

      <UiPlainButton
        v-if="!isTracked"
        size="xs"
        color="primary"
        variant="soft"
        @click="emit('configure', meta.type)"
      >
        <UIcon name="i-lucide-plus" class="size-4 shrink-0" />
        {{ $t('plant.care.add') }}
      </UiPlainButton>
    </div>

    <template v-if="isTracked && schedule && status">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="inline-flex items-center gap-1.5 text-xs font-medium">
          <span class="size-2 shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />
          <span class="text-muted">
            {{ statusLabel }}
          </span>
        </span>
        <span v-if="lastDoneLabel" class="text-dimmed text-xs">
          {{ $t('plant.care.lastDone') }} {{ lastDoneLabel }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UiPlainButton size="xs" variant="solid" @click="emit('done', meta.type)">
          <UIcon name="i-lucide-check" class="size-4 shrink-0" />
          {{ $t('plant.care.markDone') }}
        </UiPlainButton>
        <CalendarAddButton v-if="calendarReminder" size="xs" :reminder="calendarReminder" />
        <UiPlainButton
          size="xs"
          :aria-label="$t('plant.care.edit')"
          @click="emit('configure', meta.type)"
        >
          <UIcon name="i-lucide-pencil" class="size-4 shrink-0" />
          {{ $t('plant.care.edit') }}
        </UiPlainButton>
        <UiPlainButton
          size="xs"
          color="error"
          :aria-label="$t('plant.care.remove')"
          @click="emit('remove', meta.type)"
        >
          <UIcon name="i-lucide-trash-2" class="size-4 shrink-0" />
          {{ $t('plant.care.remove') }}
        </UiPlainButton>
      </div>
    </template>
  </div>
</template>
