<script setup lang="ts">
// Local-only vision model: when no worker is connected, points to the setup
// page rather than falling back to any cloud.
const { plantId, hasImage } = defineProps<{ plantId: string; hasImage: boolean }>();

const plantIdRef = computed((): string => plantId);
const { online, refresh } = useAiWorker();

const { busy, failed, offline, diagnosis, reset, diagnose } = usePlantDiagnosis({
  plantId: plantIdRef,
  aiOnline: online,
  checkWorker: refresh,
});

// Restart from scratch when the user moves to another plant's page.
watch(plantIdRef, (): void => reset());

const hasResult = computed((): boolean => diagnosis.value !== null);
</script>

<template>
  <section aria-labelledby="diagnosis-title" class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <h2 id="diagnosis-title" class="text-highlighted text-lg font-semibold">
        {{ $t('plant.diagnosis.title') }}
      </h2>
      <p class="text-dimmed text-sm">{{ $t('plant.diagnosis.subtitle') }}</p>
    </div>

    <UAlert
      v-if="!hasImage"
      color="neutral"
      variant="soft"
      icon="i-lucide-image-off"
      :title="$t('plant.diagnosis.noPhoto')"
      :description="$t('plant.diagnosis.noPhotoHint')"
    />

    <template v-else>
      <div class="flex flex-wrap items-center gap-3">
        <UButton
          color="primary"
          icon="i-lucide-stethoscope"
          :loading="busy"
          :disabled="busy"
          @click="diagnose"
        >
          {{ hasResult ? $t('plant.diagnosis.again') : $t('plant.diagnosis.run') }}
        </UButton>
        <span v-if="busy" class="text-muted text-sm" role="status">
          {{ $t('plant.diagnosis.analysing') }}
        </span>
      </div>

      <div v-if="busy" class="flex flex-col gap-2" aria-hidden="true">
        <USkeleton class="h-4 w-full rounded" />
        <USkeleton class="h-4 w-11/12 rounded" />
        <USkeleton class="h-4 w-4/5 rounded" />
      </div>

      <UAlert
        v-else-if="offline"
        color="warning"
        variant="soft"
        icon="i-lucide-plug-zap"
        :title="$t('plant.diagnosis.offlineTitle')"
      >
        <template #description>
          {{ $t('plant.diagnosis.offlineHint') }}
          <NuxtLinkLocale to="/activate-ai" class="text-primary font-medium hover:underline">
            {{ $t('plant.diagnosis.offlineLink') }}
          </NuxtLinkLocale>
        </template>
      </UAlert>

      <UAlert
        v-else-if="failed"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="$t('plant.diagnosis.failed')"
        :description="$t('plant.diagnosis.failedHint')"
      />

      <div
        v-else-if="hasResult"
        class="border-default/70 bg-elevated/30 flex flex-col gap-2 rounded-xl border p-4"
      >
        <div class="text-primary flex items-center gap-2 text-sm font-medium">
          <UIcon name="i-lucide-sparkles" class="size-4 shrink-0" aria-hidden="true" />
          <span>{{ $t('plant.diagnosis.resultTitle') }}</span>
        </div>
        <p class="text-highlighted text-sm whitespace-pre-line">{{ diagnosis }}</p>
        <p class="text-dimmed text-xs">{{ $t('plant.diagnosis.disclaimer') }}</p>
      </div>
    </template>
  </section>
</template>
