<script setup lang="ts">
const { locale, locales } = useNuxtApp().$i18n;
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
          <NuxtLinkLocale to="/" class="vine-link vine-a" :class="{ active: isActive('/', true) }">
            <UIcon name="i-lucide-house" class="size-4 shrink-0" aria-hidden="true" />
            <span class="hidden sm:inline">{{ $t('plant.layout.navHome') }}</span>
            <svg class="vine" viewBox="0 0 80 66" aria-hidden="true">
              <path
                class="v-stem"
                pathLength="100"
                d="M72 66 C 70 54 74 46 69 36 C 62 21 45 14 29 14 C 25 14 22 14 19 14"
              />
              <path class="v-leaf leaf-1" d="M71 55 C 78 54 81 49 78 44 C 73 46 71 50 71 55 Z" />
              <path class="v-leaf leaf-2" d="M70 47 C 63 46 60 41 63 37 C 67 39 69 43 70 47 Z" />
              <path class="v-leaf leaf-3" d="M68 37 C 74 35 76 29 72 26 C 68 28 67 33 68 37 Z" />
              <path class="v-leaf leaf-4" d="M60 23 C 53 22 50 17 53 13 C 57 15 59 19 60 23 Z" />
              <path class="v-leaf leaf-5" d="M47 16 C 50 9 47 3 42 5 C 42 10 44 14 47 16 Z" />
              <path class="v-leaf leaf-6" d="M34 14 C 37 7 33 1 28 3 C 28 8 31 12 34 14 Z" />
              <g class="v-flower">
                <circle class="fc" cx="19" cy="11" r="2" />
                <ellipse
                  class="fp p1"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(288 19 11)"
                />
                <ellipse
                  class="fp p2"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(216 19 11)"
                />
                <ellipse class="fp p3" cx="19" cy="8.6" rx="2.1" ry="4" />
                <ellipse
                  class="fp p4"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(144 19 11)"
                />
                <ellipse
                  class="fp p5"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(72 19 11)"
                />
              </g>
            </svg>
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/mes-plantes"
            class="vine-link vine-b"
            :class="{ active: isActive('/mes-plantes') }"
          >
            <UIcon name="i-lucide-leaf" class="size-4 shrink-0" aria-hidden="true" />
            <span class="hidden sm:inline">{{ $t('plant.layout.navPlants') }}</span>
            <svg class="vine" viewBox="0 0 80 66" aria-hidden="true">
              <path
                class="v-stem"
                pathLength="100"
                d="M72 66 C 70 54 74 46 69 36 C 62 21 45 14 29 14 C 25 14 22 14 19 14"
              />
              <path class="v-leaf leaf-1" d="M71 55 C 78 54 81 49 78 44 C 73 46 71 50 71 55 Z" />
              <path class="v-leaf leaf-2" d="M70 47 C 63 46 60 41 63 37 C 67 39 69 43 70 47 Z" />
              <path class="v-leaf leaf-3" d="M68 37 C 74 35 76 29 72 26 C 68 28 67 33 68 37 Z" />
              <path class="v-leaf leaf-4" d="M60 23 C 53 22 50 17 53 13 C 57 15 59 19 60 23 Z" />
              <path class="v-leaf leaf-5" d="M47 16 C 50 9 47 3 42 5 C 42 10 44 14 47 16 Z" />
              <path class="v-leaf leaf-6" d="M34 14 C 37 7 33 1 28 3 C 28 8 31 12 34 14 Z" />
              <g class="v-flower">
                <circle class="fc" cx="19" cy="11" r="2" />
                <ellipse
                  class="fp p1"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(288 19 11)"
                />
                <ellipse
                  class="fp p2"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(216 19 11)"
                />
                <ellipse class="fp p3" cx="19" cy="8.6" rx="2.1" ry="4" />
                <ellipse
                  class="fp p4"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(144 19 11)"
                />
                <ellipse
                  class="fp p5"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(72 19 11)"
                />
              </g>
            </svg>
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/calendar"
            class="vine-link vine-c"
            :class="{ active: isActive('/calendar') }"
          >
            <UIcon name="i-lucide-calendar-days" class="size-4 shrink-0" aria-hidden="true" />
            <span class="hidden sm:inline">{{ $t('plant.layout.navCalendar') }}</span>
            <svg class="vine" viewBox="0 0 80 66" aria-hidden="true">
              <path
                class="v-stem"
                pathLength="100"
                d="M72 66 C 70 54 74 46 69 36 C 62 21 45 14 29 14 C 25 14 22 14 19 14"
              />
              <path class="v-leaf leaf-1" d="M71 55 C 78 54 81 49 78 44 C 73 46 71 50 71 55 Z" />
              <path class="v-leaf leaf-2" d="M70 47 C 63 46 60 41 63 37 C 67 39 69 43 70 47 Z" />
              <path class="v-leaf leaf-3" d="M68 37 C 74 35 76 29 72 26 C 68 28 67 33 68 37 Z" />
              <path class="v-leaf leaf-4" d="M60 23 C 53 22 50 17 53 13 C 57 15 59 19 60 23 Z" />
              <path class="v-leaf leaf-5" d="M47 16 C 50 9 47 3 42 5 C 42 10 44 14 47 16 Z" />
              <path class="v-leaf leaf-6" d="M34 14 C 37 7 33 1 28 3 C 28 8 31 12 34 14 Z" />
              <g class="v-flower">
                <circle class="fc" cx="19" cy="11" r="2" />
                <ellipse
                  class="fp p1"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(288 19 11)"
                />
                <ellipse
                  class="fp p2"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(216 19 11)"
                />
                <ellipse class="fp p3" cx="19" cy="8.6" rx="2.1" ry="4" />
                <ellipse
                  class="fp p4"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(144 19 11)"
                />
                <ellipse
                  class="fp p5"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(72 19 11)"
                />
              </g>
            </svg>
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/activate-ai"
            class="vine-link vine-d"
            :class="{ active: isActive('/activate-ai') || aiOnline }"
            :title="aiOnline ? $t('plant.layout.aiConnected') : $t('plant.layout.navAi')"
          >
            <!-- Offline: the sparkles "activate" affordance. Online: a live,
                 pulsing dot — the real-time connection indicator. -->
            <span class="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
              <UIcon v-if="!aiOnline" name="i-lucide-sparkles" class="size-4" />
              <span v-else class="relative flex size-2.5">
                <span
                  class="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full"
                />
                <span class="bg-primary relative inline-flex size-2.5 rounded-full" />
              </span>
            </span>
            <span class="hidden sm:inline">
              {{ aiOnline ? $t('plant.layout.aiConnected') : $t('plant.layout.navAi') }}
            </span>
            <svg class="vine" viewBox="0 0 80 66" aria-hidden="true">
              <path
                class="v-stem"
                pathLength="100"
                d="M72 66 C 70 54 74 46 69 36 C 62 21 45 14 29 14 C 25 14 22 14 19 14"
              />
              <path class="v-leaf leaf-1" d="M71 55 C 78 54 81 49 78 44 C 73 46 71 50 71 55 Z" />
              <path class="v-leaf leaf-2" d="M70 47 C 63 46 60 41 63 37 C 67 39 69 43 70 47 Z" />
              <path class="v-leaf leaf-3" d="M68 37 C 74 35 76 29 72 26 C 68 28 67 33 68 37 Z" />
              <path class="v-leaf leaf-4" d="M60 23 C 53 22 50 17 53 13 C 57 15 59 19 60 23 Z" />
              <path class="v-leaf leaf-5" d="M47 16 C 50 9 47 3 42 5 C 42 10 44 14 47 16 Z" />
              <path class="v-leaf leaf-6" d="M34 14 C 37 7 33 1 28 3 C 28 8 31 12 34 14 Z" />
              <g class="v-flower">
                <circle class="fc" cx="19" cy="11" r="2" />
                <ellipse
                  class="fp p1"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(288 19 11)"
                />
                <ellipse
                  class="fp p2"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(216 19 11)"
                />
                <ellipse class="fp p3" cx="19" cy="8.6" rx="2.1" ry="4" />
                <ellipse
                  class="fp p4"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(144 19 11)"
                />
                <ellipse
                  class="fp p5"
                  cx="19"
                  cy="8.6"
                  rx="2.1"
                  ry="4"
                  transform="rotate(72 19 11)"
                />
              </g>
            </svg>
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
             loading skeleton, so without a reserved height the whole header grew
             a touch once auth settled. Pinning the slot keeps the bar one height. -->
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
            to="/"
            class="m-link"
            :class="{ 'm-active': isActive('/', true) }"
            @click="mobileOpen = false"
          >
            <UIcon name="i-lucide-house" class="size-5 shrink-0" aria-hidden="true" />
            {{ $t('plant.layout.navHome') }}
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/mes-plantes"
            class="m-link"
            :class="{ 'm-active': isActive('/mes-plantes') }"
            @click="mobileOpen = false"
          >
            <UIcon name="i-lucide-leaf" class="size-5 shrink-0" aria-hidden="true" />
            {{ $t('plant.layout.navPlants') }}
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/calendar"
            class="m-link"
            :class="{ 'm-active': isActive('/calendar') }"
            @click="mobileOpen = false"
          >
            <UIcon name="i-lucide-calendar-days" class="size-5 shrink-0" aria-hidden="true" />
            {{ $t('plant.layout.navCalendar') }}
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/activate-ai"
            class="m-link"
            :class="{ 'm-active': isActive('/activate-ai') || aiOnline }"
            @click="mobileOpen = false"
          >
            <UIcon
              :name="aiOnline ? 'i-lucide-badge-check' : 'i-lucide-sparkles'"
              class="size-5 shrink-0"
              aria-hidden="true"
            />
            {{ aiOnline ? $t('plant.layout.aiConnected') : $t('plant.layout.navAi') }}
          </NuxtLinkLocale>
        </nav>
      </template>
    </USlideover>
  </header>
</template>

<style scoped>
/* "Canopy" — a floating, frosted panel that reads as the jungle canopy the page
   emerges from under: detached from the top, soft rounded corners, and a gentle
   green-tinted depth shadow. The vines hang from its lower edge. */
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

/* The label + icon stay above the vine so a grown/bloomed vine never hides the
   text — the ivy weaves *behind* the letters. */
.vine-link > :not(.vine) {
  position: relative;
  z-index: 1;
}

/* Per-link vine: from the main ivy it climbs the RIGHT side of the link and
   arches over the top, ending above the label — where the flower blooms when the
   link is active. The stem base sits at the link's right edge. */
.vine {
  position: absolute;
  right: -8px;
  bottom: -1rem;
  z-index: 0;
  width: 78px;
  height: 64px;
  overflow: visible;
}

/* A little variation per link for a natural feel — no mirroring, so every plant
   still wraps by the right. */
.vine-b .vine {
  transform: rotate(-3deg) scale(0.97);
}
.vine-c .vine {
  transform: rotate(3deg) scale(0.95);
}
.vine-d .vine {
  transform: rotate(-2deg) scale(0.98);
}

/* At rest the stem is fully retracted AND transparent, so inactive links show
   nothing at all (opacity:0 also clears the round line-cap dot the retracted dash
   would otherwise leave at the base). Hovering a link — or the active page —
   draws the stem up from the navbar's base and unfurls the leaves in its wake.
   Pure CSS (transitions + one keyframe), no runtime animation library. */
.v-stem {
  fill: none;
  stroke: color-mix(in oklab, var(--color-green-700) 60%, transparent);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 100; /* fully retracted at rest */
  opacity: 0;
  /* RETRACT (this base state): the stem un-draws slowly (1.1s) and stays opaque
     while it does — opacity only fades at the very end, so the slow withdrawal is
     visible and the round line-cap dot never shows at rest. */
  transition:
    stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.5, 1),
    opacity 0.15s ease 1s;
}

.v-leaf {
  fill: color-mix(in oklab, var(--color-green-600) 62%, transparent);
  transform-box: fill-box;
  transform-origin: 50% 90%;
  transform: scale(0); /* folded away at rest */
  opacity: 0;
  /* Fast on the way OUT: each leaf snaps away just BEFORE the (slow) stem
     withdraws past its foot. The slow, springy way IN is set on the grown state. */
  transition:
    transform 0.12s ease,
    opacity 0.1s ease;
}
/* Leaves pivot from their foot on the stem (transform-origin at the attachment
   corner). Timing is asymmetric so a leaf tracks the stem in BOTH directions:
   - these BASE delays apply on the way OUT (un-hover) = the RETRACT order,
     tip→base, so leaves vanish in the stem's wake as it withdraws;
   - the :hover/.active delays below apply on the way IN = the GROW order,
     base→tip, so leaves sprout as the stem draws past them. */
.leaf-1 {
  transform-origin: 0% 100%;
  transition-delay: 0.72s;
}
.leaf-2 {
  transform-origin: 100% 100%;
  transition-delay: 0.57s;
}
.leaf-3 {
  transform-origin: 0% 100%;
  transition-delay: 0.42s;
}
.leaf-4 {
  transform-origin: 100% 100%;
  transition-delay: 0.27s;
}
.leaf-5 {
  transform-origin: 100% 100%;
  transition-delay: 0.13s;
}
.leaf-6 {
  transform-origin: 100% 100%;
  transition-delay: 0s;
}

/* Grow on hover, or keep grown when this is the active page. The GROW is quicker
   than the retract, and the stem fades in fast as it starts drawing. */
.vine-link:hover .v-stem,
.vine-link.active .v-stem {
  stroke-dashoffset: 0;
  opacity: 1;
  transition:
    stroke-dashoffset 0.7s cubic-bezier(0.34, 1.4, 0.5, 1),
    opacity 0.2s ease;
}
.vine-link:hover .v-leaf,
.vine-link.active .v-leaf {
  transform: scale(1);
  opacity: 1;
  /* Slower, springy on the way IN — the unfurl. */
  transition:
    transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.4s ease;
}
/* GROW order (base→tip): each leaf waits for the stem to reach its foot. */
.vine-link:hover .leaf-1,
.vine-link.active .leaf-1 {
  transition-delay: 0.09s;
}
.vine-link:hover .leaf-2,
.vine-link.active .leaf-2 {
  transition-delay: 0.17s;
}
.vine-link:hover .leaf-3,
.vine-link.active .leaf-3 {
  transition-delay: 0.25s;
}
.vine-link:hover .leaf-4,
.vine-link.active .leaf-4 {
  transition-delay: 0.36s;
}
.vine-link:hover .leaf-5,
.vine-link.active .leaf-5 {
  transition-delay: 0.45s;
}
.vine-link:hover .leaf-6,
.vine-link.active .leaf-6 {
  transition-delay: 0.54s;
}

/* Flower — only on the active link. The whole flower blooms at once (scale +
   fade) after a short debounce, once the stem has drawn up to it. */
.v-flower {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  transform: scale(0);
  opacity: 0;
}
.vine-link.active .v-flower {
  animation: bloom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s forwards;
}

@keyframes bloom {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.fp {
  fill: color-mix(in oklab, #fff 70%, var(--color-clay-300));
}

.fc {
  fill: var(--color-clay-400);
}

/* Dark mode (jungle night): green-700 vanishes on the dark ground, so the ivy
   switches to the brighter foliage greens the rest of the app uses at night. */
.dark .v-stem {
  stroke: color-mix(in oklab, var(--color-green-300) 55%, transparent);
}
.dark .v-leaf {
  fill: color-mix(in oklab, var(--color-green-400) 60%, transparent);
}
.dark .vine-link.active {
  color: var(--color-green-300);
}

@media (prefers-reduced-motion: reduce) {
  .v-stem,
  .v-leaf {
    transition: none;
  }
  .vine-link.active .v-flower {
    animation: none;
    transform: scale(1);
    opacity: 1;
  }
}
</style>
