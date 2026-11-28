<script setup lang="ts">
// Home keeps only the "to water today" band; the full collection lives on
// its own /mes-plantes page.
const { isAuthReady, isLoggedIn } = useAuth();
const { open: openAuthDialog } = useAuthDialog();
// Back to the page whose session ended, once signed in again (`?redirect=`).
useSignInRedirect();

// Ask for today's plants while the sign-in check is still running; the band reuses the answer.
// An anonymous visitor just gets a refusal nobody reads (no session, nothing to expire).
const { refresh: prefetchPlantsDue } = usePlantsDue();
onMounted(() => {
  prefetchPlantsDue().catch(() => undefined);
});
</script>

<template>
  <main id="content" class="mx-auto w-full max-w-5xl flex-1 px-6 pt-28 pb-10">
    <div v-if="!isAuthReady">
      <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>
      <div class="mb-10 flex flex-col gap-3">
        <UiSkeleton class="h-10 w-56 sm:h-12 sm:w-72" />
        <UiSkeleton class="h-6 w-80" />
      </div>
      <div aria-hidden="true">
        <div class="mb-3 flex items-center gap-2">
          <UiSkeleton class="size-5 rounded" />
          <UiSkeleton class="h-4 w-40" />
        </div>
        <div class="-mx-1 flex gap-3 overflow-hidden px-1">
          <UiSkeleton
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

      <WateringToday />
    </template>
  </main>
</template>
