<script setup lang="ts">
const { isAuthReady, isLoggedIn } = useAuth();
const isAuthDialogOpen = ref(false);

const { code, device, queryStatus, outcome, approving, approveError, approve, deny } = usePairing();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a href="#content" class="skip-link">{{ $t('accessibility.skip') }}</a>
    <PlantHeader v-model:open="isAuthDialogOpen" />
    <main id="content" class="mx-auto w-full max-w-lg flex-1 px-6 pt-28 pb-10">
      <div v-if="!isAuthReady" class="flex flex-col gap-4">
        <span class="sr-only" role="status">{{ $t('ai.pair.loading') }}</span>
        <USkeleton class="h-10 w-64" />
        <USkeleton class="h-24 w-full rounded-lg" />
      </div>

      <PlantSignInPrompt v-else-if="!isLoggedIn" @login="isAuthDialogOpen = true" />

      <template v-else>
        <header class="mb-8">
          <h1 class="text-highlighted text-3xl font-bold tracking-tight">
            {{ $t('ai.pair.title') }}
          </h1>
        </header>

        <!-- Missing code -->
        <p v-if="!code" class="text-muted">{{ $t('ai.pair.missingCode') }}</p>

        <!-- Outcome -->
        <div
          v-else-if="outcome === 'approved'"
          class="border-primary/40 bg-primary/5 flex flex-col items-center gap-4 rounded-xl border p-8 text-center"
        >
          <UIcon name="i-lucide-circle-check" class="text-primary size-12" aria-hidden="true" />
          <p class="text-highlighted font-medium">{{ $t('ai.pair.approved') }}</p>
          <UButton to="/" color="primary">{{ $t('ai.pair.backToApp') }}</UButton>
        </div>
        <div
          v-else-if="outcome === 'denied'"
          class="border-default flex flex-col items-center gap-4 rounded-xl border p-8 text-center"
        >
          <UIcon name="i-lucide-circle-x" class="text-muted size-12" aria-hidden="true" />
          <p class="text-muted">{{ $t('ai.pair.denied') }}</p>
          <UButton to="/" color="neutral" variant="soft">{{ $t('ai.pair.backToApp') }}</UButton>
        </div>

        <!-- Looking up the device -->
        <div
          v-else-if="queryStatus === 'pending' || queryStatus === 'idle'"
          class="flex items-center gap-3"
        >
          <UIcon name="i-lucide-loader-circle" class="text-muted size-5 animate-spin" aria-hidden="true" />
          <span class="text-muted text-sm">{{ $t('ai.pair.loading') }}</span>
        </div>

        <!-- No pending pairing for this code -->
        <p v-else-if="device === null" class="text-muted">{{ $t('ai.pair.notFound') }}</p>

        <!-- The confirmation prompt -->
        <div v-else class="border-default flex flex-col gap-5 rounded-xl border p-6">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
              <UIcon name="i-lucide-monitor-smartphone" class="size-6" aria-hidden="true" />
            </div>
            <div>
              <p class="text-muted text-sm">{{ $t('ai.pair.prompt') }}</p>
              <p class="text-highlighted font-semibold">
                {{ device.label ?? $t('ai.pair.unknownDevice') }}
              </p>
            </div>
          </div>

          <div class="bg-elevated/50 flex items-baseline justify-between rounded-lg px-4 py-3">
            <span class="text-muted text-xs">{{ $t('ai.pair.codeLabel') }}</span>
            <code class="text-highlighted font-mono text-lg font-semibold tracking-[0.3em]">{{ device.code }}</code>
          </div>

          <div class="text-muted flex items-start gap-2 text-xs">
            <UIcon name="i-lucide-shield-alert" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{{ $t('ai.pair.warning') }}</p>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row">
            <UButton
              color="primary"
              size="lg"
              class="flex-1 justify-center"
              icon="i-lucide-check"
              :loading="approving"
              @click="() => approve()"
            >
              {{ approving ? $t('ai.pair.approving') : $t('ai.pair.approve') }}
            </UButton>
            <UButton
              color="neutral"
              variant="soft"
              size="lg"
              class="justify-center"
              @click="() => deny()"
            >
              {{ $t('ai.pair.deny') }}
            </UButton>
          </div>
          <p v-if="approveError" class="text-error text-sm">{{ $t('ai.pair.error') }}</p>
        </div>
      </template>
    </main>
    <PlantFooter />
  </div>
</template>
