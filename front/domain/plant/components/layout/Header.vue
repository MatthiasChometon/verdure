<script setup lang="ts">
const { t, locale, locales } = useNuxtApp().$i18n;
const switchLocalePath = useSwitchLocalePath();

// Active link (for the "branch" nav's in-bloom state). Home matches exactly (it
// is the catch-all "/"), the others match their section prefix.
const route = useRoute();
const localePath = useLocalePath();
const isActive = (to: string, exact = false): boolean => {
  const target = localePath(to);
  return exact ? route.path === target : route.path.startsWith(target);
};

// The "vines" nav is CSS/SVG per link; only the active state (which sprouts a
// flower) is driven from here, via isActive on each link.
const headerNavItems = useHeaderNav();
const vineLetters = ['a', 'b', 'c', 'd'] as const;

const localeItems = computed((): SelectItem[] =>
  locales.value.map((candidate): SelectItem => ({
    label: candidate.code.toUpperCase(),
    value: candidate.code,
  })),
);

type LocaleCode = (typeof locales)['value'][number]['code'];

const onLocaleChange = async (code: string): Promise<void> => {
  await navigateTo(switchLocalePath(code as LocaleCode));
};

const open = defineModel<boolean>('open', { required: true });

// Below 900px the vine nav is swapped for a burger menu (a slideover of plain
// links — no vines/flowers at that size).
const mobileOpen = ref(false);
const { user, isAuthReady } = useAuth();

// Live GPU-worker status: drives the header indicator, and a light toast when it
// flips so the user is told in real time — no page refresh.
const { online: aiOnline } = useWorkerStatusToast();

// The AI destination has no fixed icon/label: offline shows the "activate"
// sparkles, online swaps to a live connection indicator — both navs branch on it.
const isAiNav = (to: string): boolean => to === '/activate-ai';
const aiNavLabel = computed((): string =>
  aiOnline.value ? t('plant.layout.aiConnected') : t('plant.layout.navAi'),
);

// The avatar is a menu once there is more than one thing to do with the account.
const { accountItems } = useAccountMenu();
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3">
    <div
      class="canopy bg-default/75 mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl px-4 py-3 backdrop-blur-md sm:px-6 min-[900px]:py-5"
    >
      <div class="flex items-center gap-1 justify-self-start">
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          size="lg"
          class="min-[900px]:hidden"
          :aria-label="$t('plant.layout.navLabel')"
          @click="mobileOpen = true"
        />
        <NuxtLinkLocale
          to="/"
          class="brand text-highlighted font-display flex items-center gap-2 text-xl font-semibold tracking-tight"
        >
          <!-- lucide "sprout", minus its ground line (M7 20h10) — just the plant. -->
          <svg
            class="brand-icon text-primary size-6 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M10 20c5.5-2.5.8-6.4 3-10" />
            <path
              d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"
            />
            <path
              d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"
            />
          </svg>
          <span class="hidden sm:inline">
            {{ $t('plant.layout.brand') }}<span class="brand-dot text-primary">.</span>
          </span>
        </NuxtLinkLocale>
      </div>

      <!-- "Vines" nav (≥900px). Below 900px it's replaced by the burger's plain
           menu (no vines/flowers at that size). -->
      <div class="hidden justify-self-center min-[900px]:block">
        <nav class="vine-nav" :aria-label="$t('plant.layout.navLabel')">
          <NuxtLinkLocale
            v-for="(item, index) in headerNavItems"
            :key="item.to"
            :to="item.to"
            class="vine-link"
            :class="[
              `vine-${vineLetters[index]}`,
              { active: isActive(item.to, item.to === '/') || (isAiNav(item.to) && aiOnline) },
            ]"
            :title="isAiNav(item.to) ? aiNavLabel : undefined"
          >
            <!-- Offline: the sparkles "activate" affordance. Online: a live,
                 pulsing dot — the real-time connection indicator. -->
            <span
              v-if="isAiNav(item.to)"
              class="flex size-4 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <UIcon v-if="!aiOnline" name="i-lucide-sparkles" class="size-4" />
              <span v-else class="relative flex size-2.5">
                <span
                  class="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full"
                />
                <span class="bg-primary relative inline-flex size-2.5 rounded-full" />
              </span>
            </span>
            <UIcon v-else :name="item.icon" class="size-4 shrink-0" aria-hidden="true" />
            <span class="hidden sm:inline">
              {{ isAiNav(item.to) ? aiNavLabel : $t(item.labelKey) }}
            </span>
            <PlantVine />
          </NuxtLinkLocale>
        </nav>
      </div>

      <div class="col-start-3 flex items-center justify-self-end gap-2">
        <UColorModeButton :aria-label="$t('plant.layout.themeLabel')" />
        <USelect
          :model-value="locale"
          :items="localeItems"
          size="sm"
          color="neutral"
          variant="ghost"
          class="w-16 sm:w-20"
          :aria-label="$t('plant.layout.langLabel')"
          @update:model-value="onLocaleChange"
        />

        <!-- Fixed-height slot: the avatar button resolves ~8px taller than the
             skeleton, so an unreserved height grew the header once auth settled. -->
        <div class="flex h-10 items-center">
          <ClientOnly>
            <USkeleton v-if="!isAuthReady" class="size-8 rounded-full" />
            <UDropdownMenu v-else-if="user" :items="accountItems">
              <UButton variant="ghost" color="neutral" size="sm" :aria-label="$t('auth.account')">
                <UAvatar :src="user.avatarUrl ?? undefined" :alt="user.name" size="sm" />
              </UButton>
            </UDropdownMenu>
            <UButton
              v-else
              size="sm"
              color="neutral"
              variant="subtle"
              icon="i-lucide-log-in"
              :aria-label="$t('auth.signIn')"
              @click="open = true"
            >
              <span class="hidden sm:inline">{{ $t('auth.signIn') }}</span>
            </UButton>
            <template #fallback>
              <USkeleton class="size-8 rounded-full" />
            </template>
          </ClientOnly>
        </div>
      </div>
    </div>
    <AuthDialog v-model:open="open" />

    <!-- Mobile (<900px) menu: the same destinations as plain links. -->
    <USlideover
      v-model:open="mobileOpen"
      side="left"
      :title="$t('plant.layout.brand')"
      :ui="{ content: 'max-w-72' }"
    >
      <template #body>
        <nav class="flex flex-col gap-1" :aria-label="$t('plant.layout.navLabel')">
          <NuxtLinkLocale
            v-for="item in headerNavItems"
            :key="item.to"
            :to="item.to"
            class="m-link"
            :class="{
              'm-active': isActive(item.to, item.to === '/') || (isAiNav(item.to) && aiOnline),
            }"
            @click="mobileOpen = false"
          >
            <UIcon
              :name="
                isAiNav(item.to)
                  ? aiOnline
                    ? 'i-lucide-badge-check'
                    : 'i-lucide-sparkles'
                  : item.icon
              "
              class="size-5 shrink-0"
              aria-hidden="true"
            />
            {{ isAiNav(item.to) ? aiNavLabel : $t(item.labelKey) }}
          </NuxtLinkLocale>
        </nav>
      </template>
    </USlideover>
  </header>
</template>

<style scoped>
/* "Canopy": a detached, frosted panel reading as the jungle canopy the page
   emerges from — the vines hang from its lower edge. */
.canopy {
  position: relative;
  border: 1px solid color-mix(in oklab, var(--color-green-800) 12%, transparent);
  box-shadow:
    0 14px 34px -16px color-mix(in oklab, var(--color-green-950) 42%, transparent),
    0 3px 10px -6px color-mix(in oklab, var(--color-green-950) 28%, transparent);
}

/* Brand hover: the sprout wakes up — grows from its base and sways gently, the
   whole logo lifts a touch, and the green full-stop pops. */
.brand {
  transition: transform 0.25s ease;
}
.brand:hover {
  transform: translateY(-1px);
}
.brand-icon {
  transform-origin: 50% 85%;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.brand:hover .brand-icon {
  animation: sprout-sway 1.3s ease-in-out infinite;
}
.brand-dot {
  display: inline-block;
  transform-origin: 50% 100%;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.brand:hover .brand-dot {
  transform: scale(1.45);
}

@keyframes sprout-sway {
  0%,
  100% {
    transform: scale(1.12) rotate(-5deg);
  }
  50% {
    transform: scale(1.12) rotate(5deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand:hover {
    transform: none;
  }
  .brand:hover .brand-icon {
    animation: none;
    transform: scale(1.1);
  }
}

/* Mobile menu links inside the burger slideover (<900px) — plain, comfortable
   tap targets; no vines. */
.m-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.5rem;
  padding: 0.65rem 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.m-link:hover {
  background-color: var(--ui-bg-elevated);
  color: var(--ui-text-highlighted);
}
.m-active {
  color: var(--color-green-700);
  background-color: color-mix(in oklab, var(--color-green-500) 12%, transparent);
}
.dark .m-active {
  color: var(--color-green-300);
}

.vine-nav {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.vine-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  padding: 0.35rem 0.6rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  /* Legibility halo: the label paints its own soft ground in the header colour,
     so letters stay crisp over the ivy behind them without dimming the animation. */
  text-shadow:
    0 0 3px var(--ui-bg, var(--canopy-page)),
    0 0 6px var(--ui-bg, var(--canopy-page));
  transition: color 0.22s ease;
}

@media (min-width: 640px) {
  .vine-link {
    padding-inline: 0.75rem;
  }
}

.vine-link:hover {
  color: var(--ui-text-highlighted);
}

.vine-link.active {
  color: var(--color-green-700);
}
.dark .vine-link.active {
  color: var(--color-green-300);
}

/* The label + icon stay above the vine so a grown/bloomed vine never hides the
   text — the ivy weaves *behind* the letters. */
.vine-link > :not(.vine) {
  position: relative;
  z-index: 1;
}
</style>
