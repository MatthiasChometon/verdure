<script setup lang="ts">
const emit = defineEmits<{ login: [] }>();
</script>

<template>
  <UiAnimationReveal variant="up">
    <div class="flex flex-col items-center gap-6 py-24 text-center">
      <div
        class="from-primary/15 text-primary ring-primary/10 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br to-green-500/5 ring-1"
      >
        <UIcon name="i-lucide-sprout" class="size-10" aria-hidden="true" />
      </div>
      <div class="flex max-w-md flex-col gap-3">
        <h1 class="text-highlighted text-3xl font-semibold sm:text-4xl">
          {{ $t('plant.signIn.title') }}
        </h1>
        <p class="text-muted text-base text-pretty">{{ $t('plant.signIn.hint') }}</p>
      </div>
      <UButton icon="i-lucide-log-in" size="lg" @click="emit('login')">
        {{ $t('auth.signIn') }}
      </UButton>
    </div>
  </UiAnimationReveal>
</template>
