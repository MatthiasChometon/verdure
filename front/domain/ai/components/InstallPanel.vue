<script setup lang="ts">
const { folderUrl, requirements } = useActivateContent();

const steps = [1, 2, 3] as const;
</script>

<template>
  <h2 class="text-highlighted mb-3 text-base font-semibold">
    {{ $t('ai.activate.installTitle') }}
  </h2>
  <div class="border-default/60 bg-default mb-5 rounded-xl border p-4">
    <h3 class="text-highlighted mb-2 text-sm font-semibold">{{ $t('ai.activate.reqTitle') }}</h3>
    <ul class="text-muted flex flex-col gap-1.5 text-sm">
      <li v-for="req in requirements" :key="req.key" class="flex items-start gap-2">
        <UIcon :name="req.icon" class="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ $t(`ai.activate.req.${req.key}`) }}</span>
      </li>
    </ul>
  </div>
  <UButton :to="folderUrl" external download color="primary" size="lg" icon="i-lucide-download">
    {{ $t('ai.activate.download') }}
  </UButton>
  <ol class="text-muted mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
    <li v-for="(step, index) in steps" :key="step" class="flex items-center gap-2">
      <span class="flex items-center gap-1.5">
        <span
          class="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-xs font-bold"
          >{{ step }}</span
        >
        <span class="text-highlighted font-medium">
          {{ $t(`ai.activate.step${step}Title`) }}
        </span>
      </span>
      <UIcon
        v-if="index < 2"
        name="i-lucide-chevron-right"
        class="text-dimmed size-4"
        aria-hidden="true"
      />
    </li>
  </ol>
</template>
