<script setup lang="ts">
const { isAuthReady, isLoggedIn } = useAuth();
const { open: openAuthDialog } = useAuthDialog();

const { tokens, anyOnline, revokingId, revoke } = useWorkerTokens();

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
  { key: 'smartSearch', icon: 'i-lucide-sparkles' },
  { key: 'free', icon: 'i-lucide-gift' },
] as const;

// What the local AI actually lets you do, shown up front so the value is clear
// before the setup steps.
const capabilities = [
  { key: 'diagnosis', icon: 'i-lucide-stethoscope' },
  { key: 'search', icon: 'i-lucide-search' },
  { key: 'recognition', icon: 'i-lucide-leaf' },
] as const;
</script>

<template>
  <main id="content" class="mx-auto w-full max-w-3xl flex-1 px-6 pt-28 pb-10">
    <div v-if="!isAuthReady">
      <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>

      <!-- Header -->
      <div class="mb-8 flex flex-col gap-3">
        <USkeleton class="h-10 w-64 sm:h-12" />
        <USkeleton class="h-6 w-80 max-w-full" />
      </div>

      <!-- Action panel (status · install · my computers) -->
      <div
        class="border-default/70 bg-elevated/30 mb-14 flex flex-col gap-5 rounded-3xl border p-6 shadow-sm sm:p-8"
      >
        <USkeleton class="h-8 w-52 rounded-full" />
        <USkeleton class="h-5 w-40" />
        <USkeleton class="h-28 w-full rounded-xl" />
        <USkeleton class="h-11 w-52 rounded-md" />
        <div class="flex flex-wrap gap-3">
          <USkeleton class="h-6 w-28 rounded-full" />
          <USkeleton class="h-6 w-28 rounded-full" />
          <USkeleton class="h-6 w-28 rounded-full" />
        </div>
        <USkeleton class="h-px w-full" />
        <USkeleton class="h-5 w-44" />
        <USkeleton class="h-5 w-64 max-w-full" />
      </div>

      <!-- How it works -->
      <USkeleton class="mb-8 h-44 w-full rounded-2xl" />

      <!-- Benefits -->
      <div class="flex flex-wrap gap-2.5">
        <USkeleton v-for="n in 4" :key="n" class="h-8 w-32 rounded-full" />
      </div>
    </div>

    <PlantSignInPrompt v-else-if="!isLoggedIn" @login="openAuthDialog" />

    <template v-else>
      <UiAnimationReveal variant="up">
        <header class="mb-8">
          <h1 class="text-highlighted text-4xl font-bold tracking-tight sm:text-5xl">
            {{ $t('ai.activate.title') }}
          </h1>
          <p class="text-muted mt-3 text-lg">{{ $t('ai.activate.subtitle') }}</p>
        </header>
      </UiAnimationReveal>

      <!-- What the local AI unlocks — the value, said plainly, before the how. -->
      <UiAnimationReveal variant="up">
        <section aria-labelledby="capabilities-title" class="mb-14">
          <h2 id="capabilities-title" class="text-highlighted mb-4 text-base font-semibold">
            {{ $t('ai.activate.capabilities.title') }}
          </h2>
          <ul class="grid gap-3 sm:grid-cols-3">
            <li
              v-for="capability in capabilities"
              :key="capability.key"
              class="border-default/70 bg-elevated/30 flex flex-col gap-2 rounded-2xl border p-4"
            >
              <span
                class="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl"
              >
                <UIcon :name="capability.icon" class="size-5" aria-hidden="true" />
              </span>
              <span class="text-highlighted text-sm font-semibold">
                {{ $t(`ai.activate.capabilities.items.${capability.key}.title`) }}
              </span>
              <span class="text-muted text-sm">
                {{ $t(`ai.activate.capabilities.items.${capability.key}.desc`) }}
              </span>
            </li>
          </ul>
        </section>
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
</template>
