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

// Load the devices once the user is known.
watch(
  user,
  (current): void => {
    if (current) {
      void refresh();
    }
  },
  { immediate: true },
);

const newLabel = ref('');
const issuedToken = ref<string | null>(null);
const copied = ref(false);

const {
  status: createStatus,
  error: createError,
  execute: runCreate,
} = useMutation(async (): Promise<void> => {
  const { createWorkerToken } = await GqlCreateWorkerToken({
    label: newLabel.value.trim() || undefined,
  });
  issuedToken.value = createWorkerToken.token;
  newLabel.value = '';
  await refresh();
});
const creating = computed((): boolean => createStatus.value === 'pending');

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

const dockerCommand = 'docker compose -f docker-compose.yml -f docker-compose.worker.yml up -d';

const copyToken = async (): Promise<void> => {
  if (issuedToken.value === null) {
    return;
  }
  await navigator.clipboard.writeText(issuedToken.value);
  copied.value = true;
  setTimeout((): void => {
    copied.value = false;
  }, 1500);
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

        <!-- Create a token -->
        <section class="mb-8">
          <div class="flex flex-col gap-2 sm:flex-row">
            <UInput
              v-model="newLabel"
              class="flex-1"
              :placeholder="$t('ai.activate.labelPlaceholder')"
              @keydown.enter="runCreate"
            />
            <UButton color="primary" icon="i-lucide-plus" :loading="creating" @click="runCreate">
              {{ creating ? $t('ai.activate.creating') : $t('ai.activate.create') }}
            </UButton>
          </div>
          <p v-if="createError" class="text-error mt-2 text-sm">
            {{ $t('ai.activate.error') }}
          </p>
        </section>

        <!-- Freshly issued token (shown once) -->
        <section
          v-if="issuedToken !== null"
          class="border-primary/40 bg-primary/5 mb-8 rounded-xl border p-4"
        >
          <h2 class="text-highlighted mb-1 text-sm font-semibold">
            {{ $t('ai.activate.tokenReadyTitle') }}
          </h2>
          <p class="text-muted mb-3 text-xs">{{ $t('ai.activate.tokenOnce') }}</p>
          <div class="flex items-center gap-2">
            <code
              class="bg-default border-default flex-1 overflow-x-auto rounded-md border px-3 py-2 font-mono text-xs"
              >{{ issuedToken }}</code
            >
            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              @click="copyToken"
            >
              {{ copied ? $t('ai.activate.copied') : $t('ai.activate.copy') }}
            </UButton>
          </div>

          <h3 class="text-highlighted mt-4 mb-1 text-sm font-semibold">
            {{ $t('ai.activate.stepsTitle') }}
          </h3>
          <p class="text-muted mb-2 text-xs">{{ $t('ai.activate.steps') }}</p>
          <pre
            class="bg-default border-default overflow-x-auto rounded-md border px-3 py-2 font-mono text-xs leading-relaxed"
            >{{ dockerCommand }}</pre>
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
