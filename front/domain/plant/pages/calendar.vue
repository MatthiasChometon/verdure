<script setup lang="ts">
const { user, status: authStatus } = useAuth();

const isAuthDialogOpen = ref(false);
const isAuthReady = computed(
  (): boolean => authStatus.value === 'success' || authStatus.value === 'error',
);
const isLoggedIn = computed((): boolean => user.value !== null);
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a href="#content" class="skip-link">{{ $t('accessibility.skip') }}</a>
    <PlantHeader v-model:open="isAuthDialogOpen" />
    <main id="content" class="mx-auto w-full max-w-5xl flex-1 px-6 pt-28 pb-10">
      <div v-if="!isAuthReady">
        <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>
        <div class="mb-10 flex flex-col gap-3">
          <USkeleton class="h-10 w-64 sm:h-12 sm:w-80" />
          <USkeleton class="h-6 w-72" />
        </div>
        <div class="mb-4 flex items-center justify-between">
          <USkeleton class="h-8 w-8 rounded-md" />
          <USkeleton class="h-6 w-40" />
          <USkeleton class="h-8 w-8 rounded-md" />
        </div>
        <div class="grid grid-cols-7 gap-px" aria-hidden="true">
          <USkeleton v-for="weekday in 7" :key="`weekday-${weekday}`" class="mx-auto my-1 h-4 w-8" />
          <USkeleton v-for="cell in 42" :key="`cell-${cell}`" class="min-h-20 rounded-lg" />
        </div>
      </div>

      <PlantSignInPrompt v-else-if="!isLoggedIn" @login="isAuthDialogOpen = true" />

      <template v-else>
        <UiAnimationReveal variant="up">
          <header class="mb-10">
            <h1 class="text-highlighted text-4xl font-bold tracking-tight sm:text-5xl">
              {{ $t('plant.calendar.title') }}
            </h1>
            <p class="text-muted mt-3 text-lg">{{ $t('plant.calendar.subtitle') }}</p>
          </header>
        </UiAnimationReveal>

        <PlantCalendar />
      </template>
    </main>
    <PlantFooter />
  </div>
</template>
