<script setup lang="ts">
import type { CareType } from '#gql/default';

const { plantId } = defineProps<{ plantId: string }>();

const plantIdRef = computed((): string => plantId);
const { careTypes } = useCareTypes();
const {
  scheduleFor,
  isLoaded,
  hasError,
  actionFailed,
  isSaving,
  refresh,
  setSchedule,
  logCare,
  removeSchedule,
} = useCareSchedules(plantIdRef);

const dialogOpen = ref(false);
const dialogType = ref<CareType | null>(null);
const dialogInitial = ref(30);

const openConfigure = (type: CareType): void => {
  dialogType.value = type;
  const existing = scheduleFor(type);
  const meta = careTypes.find((care) => care.type === type);
  dialogInitial.value = existing?.intervalDays ?? meta?.defaultIntervalDays ?? 30;
  dialogOpen.value = true;
};

const onSubmit = async (intervalDays: number): Promise<void> => {
  if (dialogType.value === null) {
    return;
  }
  const ok = await setSchedule(dialogType.value, intervalDays);
  if (ok) {
    dialogOpen.value = false;
  }
};
</script>

<template>
  <section aria-labelledby="care-schedules-title" class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <h2 id="care-schedules-title" class="text-highlighted text-lg font-semibold">
        {{ $t('plant.care.title') }}
      </h2>
      <p class="text-dimmed text-sm">{{ $t('plant.care.subtitle') }}</p>
    </div>

    <UAlert
      v-if="hasError"
      color="error"
      variant="soft"
      icon="i-lucide-triangle-alert"
      :title="$t('plant.care.error')"
      :actions="[
        { label: $t('plant.retry'), color: 'neutral', variant: 'soft', onClick: () => refresh() },
      ]"
    />

    <div v-else-if="!isLoaded" class="flex flex-col gap-3" aria-hidden="true">
      <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>
      <USkeleton v-for="row in careTypes.length" :key="`care-sk-${row}`" class="h-20 rounded-xl" />
    </div>

    <template v-else>
      <div class="grid gap-3 sm:grid-cols-2">
        <PlantCareTypeRow
          v-for="meta in careTypes"
          :key="meta.type"
          :meta="meta"
          :schedule="scheduleFor(meta.type)"
          @configure="openConfigure"
          @done="logCare"
          @remove="removeSchedule"
        />
      </div>

      <p v-if="actionFailed" class="text-error text-sm" role="alert">
        {{ $t('plant.care.actionFailed') }}
      </p>
    </template>

    <PlantCareDialog
      v-model:open="dialogOpen"
      :type="dialogType"
      :initial-interval="dialogInitial"
      :saving="isSaving"
      @submit="onSubmit"
    />
  </section>
</template>
