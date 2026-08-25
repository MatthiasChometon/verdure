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

// Load the devices once the user is known, then keep polling so a computer that
// finishes connecting appears here without a manual refresh.
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

// A small installer (~2 MB, hosted on o2switch): run it once, it fetches the
// runtime, installs the app under AI\ComfyUI_windows_portable and adds a
// system-tray launcher — installed locally, so it runs with no security prompt
// afterwards. No command line, no Docker.
const folderUrl = 'https://verdureee.duckdns.org/dl/verdure%20ia.exe';

// What the computer needs for the folder to run — the honest checklist, shown
// before the steps so nobody downloads 5.5 GB for nothing.
const requirements = [
  { key: 'os', icon: 'i-lucide-monitor' },
  { key: 'gpu', icon: 'i-lucide-cpu' },
  { key: 'ram', icon: 'i-lucide-memory-stick' },
  { key: 'disk', icon: 'i-lucide-hard-drive' },
] as const;

// The "limits" (needs a GPU, runs locally) said as the benefits they are.
const perks = [
  { key: 'private', icon: 'i-lucide-lock' },
  { key: 'power', icon: 'i-lucide-cpu' },
  { key: 'free', icon: 'i-lucide-gift' },
] as const;

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

        <!-- Action panel — status, install and your computers grouped: this is
             everything you actually do, in one place. -->
        <section
          class="border-default/70 bg-elevated/30 mb-14 rounded-3xl border p-6 shadow-sm sm:p-8"
        >
          <!-- status badge -->
          <div
            class="border-default/70 bg-default mb-6 inline-flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-3 text-sm"
          >
            <span
              class="inline-flex size-2.5 shrink-0 rounded-full"
              :class="anyOnline ? 'bg-primary' : 'bg-muted'"
              aria-hidden="true"
            />
            <span class="text-highlighted font-medium">
              {{
                anyOnline ? $t('ai.activate.statusConnected') : $t('ai.activate.statusDisconnected')
              }}
            </span>
          </div>

          <!-- install: what you need, one CTA, then a light 1-2-3 stepper -->
          <h2 class="text-highlighted mb-3 text-base font-semibold">
            {{ $t('ai.activate.installTitle') }}
          </h2>
          <div class="border-default/60 bg-default mb-5 rounded-xl border p-4">
            <h3 class="text-highlighted mb-2 text-sm font-semibold">
              {{ $t('ai.activate.reqTitle') }}
            </h3>
            <ul class="text-muted flex flex-col gap-1.5 text-sm">
              <li v-for="req in requirements" :key="req.key" class="flex items-start gap-2">
                <UIcon
                  :name="req.icon"
                  class="text-primary mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{{ $t(`ai.activate.req.${req.key}`) }}</span>
              </li>
            </ul>
          </div>
          <UButton
            :to="folderUrl"
            external
            download
            color="primary"
            size="lg"
            icon="i-lucide-download"
          >
            {{ $t('ai.activate.download') }}
          </UButton>
          <ol class="text-muted mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
            <li v-for="(step, index) in [1, 2, 3]" :key="step" class="flex items-center gap-2">
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

          <hr class="border-default/60 my-6" />

          <!-- my computers -->
          <h2 class="text-highlighted mb-3 text-base font-semibold">
            {{ $t('ai.activate.tokensTitle') }}
          </h2>
          <p v-if="tokens.length === 0" class="text-muted text-sm">
            {{ $t('ai.activate.noTokens') }}
          </p>
          <ul v-else class="flex flex-col gap-2">
            <li
              v-for="token in tokens"
              :key="token.id"
              class="border-default bg-default flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
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

        <!-- Explanation — how it works, then the benefits, kept at the bottom
             for whoever wants the why after the how. -->
        <AiHowItWorks class="mb-8" />

        <ul class="flex flex-wrap gap-2.5">
          <li
            v-for="perk in perks"
            :key="perk.key"
            class="border-default/70 bg-elevated/40 flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm"
          >
            <UIcon :name="perk.icon" class="text-primary size-4 shrink-0" aria-hidden="true" />
            <span class="text-highlighted font-medium">
              {{ $t(`ai.activate.perks.${perk.key}.title`) }}
            </span>
          </li>
        </ul>
      </template>
    </main>
    <PlantFooter />
  </div>
</template>
