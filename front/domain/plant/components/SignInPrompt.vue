<script setup lang="ts">
const emit = defineEmits<{ login: [] }>();
</script>

<template>
  <div class="flex flex-col items-center gap-4 py-20 text-center">
    <div class="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-2xl">
      <UIcon name="i-lucide-lock" class="size-8" aria-hidden="true" />
    </div>
    <div class="flex flex-col gap-1">
      <h1 class="text-highlighted text-lg font-semibold">{{ $t('plant.signIn.title') }}</h1>
      <p class="text-muted text-sm">{{ $t('plant.signIn.hint') }}</p>
    </div>
    <UButton icon="i-lucide-log-in" size="lg" @click="emit('login')">
      {{ $t('auth.signIn') }}
    </UButton>
  </div>
</template>
