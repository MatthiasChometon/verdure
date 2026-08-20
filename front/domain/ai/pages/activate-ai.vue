<script setup lang="ts">
const { user, status: authStatus } = useAuth();

const isAuthDialogOpen = ref(false);
const isAuthReady = computed(
  (): boolean => authStatus.value === 'success' || authStatus.value === 'error',
);
const isLoggedIn = computed((): boolean => user.value !== null);

const { data, refresh } = useQuery('ai-worker-tokens', () => GqlWorkerTokens(), {
  server: false,
});
const tokens = computed((): WorkerToken[] => data.value?.workerTokens ?? []);
const anyOnline = computed((): boolean => tokens.value.some((token) => token.online));

// Load the devices once the user is known, then keep polling so a device that
// finishes pairing appears here without a manual refresh.
let poll: ReturnType<typeof setInterval> | undefined;
watch(
  user,
  (current): void => {
    if (current) {
      void refresh();
    }
  },
  { immediate: true },
);
onMounted((): void => {
  poll = setInterval((): void => {
    if (user.value) {
      void refresh();
    }
  }, 5000);
});
onBeforeUnmount((): void => {
  if (poll) {
    clearInterval(poll);
  }
});

// The ready-to-run worker bundle (option 2): a folder the user unzips and starts.
const downloadUrl = '/worker/verdure-worker.zip';

const revokingId = ref<string | null>(null);
const { execute: runRevoke } = useMutation(async (): Promise<void> => {
  if (revokingId.value === null) {
    return;
  }
  await GqlRevokeWorkerToken({ id: revokingId.value });
  await refresh();
});
const revoke = async (id: string): Promise<void> => {
  revokingId.value = id;
  await runRevoke();
  revokingId.value = null;
};
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a href="#content" class="skip-link">{{ $t('accessibility.skip') }}</a>
    <PlantHeader v-model:open="isAuthDialogOpen" />
    <main id="content" class="mx-auto w-full max-w-3xl flex-1 px-6 pt-28 pb-10">
      <div v-if="!isAuthReady" class="flex flex-col gap-4">
        <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>
        <USkeleton class="h-10 w-64" />
        <USkeleton class="h-6 w-80" />
        <USkeleton class="h-24 w-full rounded-lg" />
      </div>

      <PlantSignInPrompt v-else-if="!isLoggedIn" @login="isAuthDialogOpen = true" />

      <template v-else>
        <UiAnimationReveal variant="up">
          <header class="mb-8">
            <h1 class="text-highlighted text-4xl font-bold tracking-tight sm:text-5xl">
              {{ $t('ai.activate.title') }}
            </h1>
            <p class="text-muted mt-3 text-lg">{{ $t('ai.activate.subtitle') }}</p>
          </header>
        </UiAnimationReveal>

        <!-- Connection status -->
        <div
          class="border-default mb-6 flex items-center gap-3 rounded-xl border p-4"
          :class="anyOnline ? 'bg-primary/5' : 'bg-elevated/50'"
        >
          <span
            class="inline-flex size-2.5 shrink-0 rounded-full"
            :class="anyOnline ? 'bg-primary' : 'bg-muted'"
            aria-hidden="true"
          />
          <div>
            <p class="text-highlighted text-sm font-semibold">
              {{
                anyOnline ? $t('ai.activate.statusConnected') : $t('ai.activate.statusDisconnected')
              }}
            </p>
            <p v-if="!anyOnline" class="text-muted text-sm">
              {{ $t('ai.activate.statusHint') }}
            </p>
          </div>
        </div>

        <!-- How it works -->
        <section class="mb-8">
          <h2 class="text-highlighted mb-1 text-sm font-semibold">
            {{ $t('ai.activate.howTitle') }}
          </h2>
          <p class="text-muted text-sm leading-relaxed">{{ $t('ai.activate.how') }}</p>
        </section>

        <!-- Step 1: download the worker -->
        <section class="mb-8">
          <h2 class="text-highlighted mb-2 text-sm font-semibold">
            {{ $t('ai.activate.downloadTitle') }}
          </h2>
          <UButton
            :to="downloadUrl"
            external
            download
            color="primary"
            size="lg"
            icon="i-lucide-download"
          >
            {{ $t('ai.activate.download') }}
          </UButton>
          <p class="text-muted mt-2 text-sm">{{ $t('ai.activate.downloadHint') }}</p>
        </section>

        <!-- Step 2: connect -->
        <section class="mb-8">
          <h2 class="text-highlighted mb-1 text-sm font-semibold">
            {{ $t('ai.activate.connectTitle') }}
          </h2>
          <p class="text-muted text-sm leading-relaxed">{{ $t('ai.activate.connectHint') }}</p>
        </section>

        <!-- Registered devices -->
        <section>
          <h2 class="text-highlighted mb-3 text-sm font-semibold">
            {{ $t('ai.activate.tokensTitle') }}
          </h2>
          <p v-if="tokens.length === 0" class="text-muted text-sm">
            {{ $t('ai.activate.noTokens') }}
          </p>
          <ul v-else class="flex flex-col gap-2">
            <li
              v-for="token in tokens"
              :key="token.id"
              class="border-default flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
            >
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex size-2 shrink-0 rounded-full"
                  :class="token.online ? 'bg-primary' : 'bg-muted'"
                  aria-hidden="true"
                />
                <span class="text-highlighted text-sm font-medium">
                  {{ token.label ?? '—' }}
                </span>
                <span class="text-muted text-xs">
                  {{ token.online ? $t('ai.activate.online') : $t('ai.activate.offline') }}
                </span>
              </div>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                :aria-label="$t('ai.activate.revoke')"
                :loading="revokingId === token.id"
                @click="revoke(token.id)"
              />
            </li>
          </ul>
        </section>
      </template>
    </main>
    <PlantFooter />
  </div>
</template>
