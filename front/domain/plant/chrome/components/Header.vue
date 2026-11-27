<script setup lang="ts">
// The "vines" nav is CSS/SVG per link; only the active state (which sprouts a
// flower) is driven from here, via `active` on each item.
const vineLetters: string[] = ['a', 'b', 'c', 'd'];

const open = defineModel<boolean>('open', { required: true });

// Below 900px the vine nav is swapped for a burger menu (a slideover of plain
// links — no vines/flowers at that size).
const mobileOpen = ref(false);
const { user, isAuthReady } = useAuth();

// The sign-in dialog and the burger menu are closed at load: their code is mounted the first
// time they open, then kept, so hydration does not pay for them.
const authDialogMounted = ref(open.value);
const mobileMenuMounted = ref(false);
watch(open, (isOpen): void => {
  if (isOpen) authDialogMounted.value = true;
});
watch(mobileOpen, (isOpen): void => {
  if (isOpen) mobileMenuMounted.value = true;
});

// Live GPU-worker status: drives the header indicator, and a light toast when it
// flips so the user is told in real time — no page refresh.
const { online: aiOnline } = useWorkerStatusToast();

// The AI destination has no fixed icon/label: offline shows the "activate"
// sparkles, online swaps to a live connection indicator (see useHeaderNav).
const { items: navItems } = useHeaderNav((): boolean => aiOnline.value);

// The avatar is a menu once there is more than one thing to do with the account.
const { accountItems } = useAccountMenu();

// The menu entries are translated (and their messages compiled) only once the avatar is reached
// for: hydration does not pay for a menu nobody has opened yet.
const isAccountMenuArmed = ref(false);
const armAccountMenu = (): void => {
  isAccountMenuArmed.value = true;
};
const armedAccountItems = computed(() => (isAccountMenuArmed.value ? accountItems.value : []));
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3">
    <div
      class="canopy bg-default/75 mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl px-4 py-3 backdrop-blur-md sm:px-6 min-[900px]:py-5"
    >
      <div class="flex items-center gap-1 justify-self-start">
        <UiPlainButton
          size="lg"
          square
          class="min-[900px]:hidden"
          :aria-label="$t('plant.layout.navLabel')"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = true"
        >
          <UIcon name="i-lucide-menu" class="size-5 shrink-0" />
        </UiPlainButton>
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
            v-for="(item, index) in navItems"
            :key="item.to"
            :to="item.to"
            class="vine-link"
            :class="[`vine-${vineLetters[index]}`, { active: item.active }]"
            :title="item.isAi ? item.label : undefined"
          >
            <!-- Offline: the sparkles "activate" affordance. Online: a live,
                 pulsing dot — the real-time connection indicator. -->
            <span
              v-if="item.isAi"
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
              {{ item.label }}
            </span>
            <PlantVine />
          </NuxtLinkLocale>
        </nav>
      </div>

      <div class="col-start-3 flex items-center justify-self-end gap-2">
        <UColorModeButton :aria-label="$t('plant.layout.themeLabel')" />
        <!-- The language menu only needs its code when someone reaches for it. -->
        <LazyPlantLocaleSwitch hydrate-on-interaction />

        <!-- Fixed-height slot: the avatar button resolves ~8px taller than the
             skeleton, so an unreserved height grew the header once auth settled. -->
        <div
          class="flex h-10 items-center"
          @pointerenter.once="armAccountMenu"
          @pointerdown.capture="armAccountMenu"
          @focusin.once="armAccountMenu"
          @keydown.capture="armAccountMenu"
        >
          <ClientOnly>
            <UiSkeleton v-if="!isAuthReady" class="size-8 rounded-full" />
            <UDropdownMenu v-else-if="user" :items="armedAccountItems">
              <UiPlainButton size="sm" :aria-label="$t('auth.account')">
                <UAvatar
                  v-bind="user.avatarUrl ? { src: user.avatarUrl } : {}"
                  :alt="user.name"
                  size="sm"
                />
              </UiPlainButton>
            </UDropdownMenu>
            <UiPlainButton
              v-else
              variant="subtle"
              size="sm"
              :aria-label="$t('auth.signIn')"
              @click="open = true"
            >
              <UIcon name="i-lucide-log-in" class="size-4 shrink-0" />
              <span class="hidden sm:inline">{{ $t('auth.signIn') }}</span>
            </UiPlainButton>
            <template #fallback>
              <UiSkeleton class="size-8 rounded-full" />
            </template>
          </ClientOnly>
        </div>
      </div>
    </div>
    <LazyAuthDialog v-if="authDialogMounted" v-model:open="open" />

    <LazyPlantMobileMenu v-if="mobileMenuMounted" v-model:open="mobileOpen" :items="navItems" />
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
