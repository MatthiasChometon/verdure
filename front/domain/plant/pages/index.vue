<script setup lang="ts">
// Home keeps only the "to water today" band; the full collection lives on
// its own /mes-plantes page.
const { isAuthReady, isLoggedIn } = useAuth();
const { open: openAuthDialog } = useAuthDialog();
</script>

<template>
  <main id="content" class="mx-auto w-full max-w-5xl flex-1 px-6 pt-28 pb-10">
    <div v-if="!isAuthReady">
      <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>
      <div class="mb-10 flex flex-col gap-3">
        <USkeleton class="h-10 w-56 sm:h-12 sm:w-72" />
        <USkeleton class="h-6 w-80" />
      </div>
      <div aria-hidden="true">
        <div class="mb-3 flex items-center gap-2">
          <USkeleton class="size-5 rounded" />
          <USkeleton class="h-4 w-40" />
        </div>
        <div class="-mx-1 flex gap-3 overflow-hidden px-1">
          <USkeleton
            v-for="card in 3"
            :key="`card-${card}`"
            class="h-40 w-40 shrink-0 rounded-xl"
          />
        </div>
      </div>
    </div>

    <PlantSignInPrompt v-else-if="!isLoggedIn" @login="openAuthDialog" />

    <template v-else>
      <UiAnimationReveal variant="up">
        <header class="mb-10">
          <h1 class="text-highlighted text-4xl font-bold tracking-tight sm:text-5xl">
            {{ $t('plant.today.pageTitle') }}
          </h1>
          <p class="text-muted mt-3 text-lg">{{ $t('plant.today.pageSubtitle') }}</p>
        </header>
      </UiAnimationReveal>

      <PlantTodayWatering />
    </template>
  </main>
</template>
