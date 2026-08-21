<script setup lang="ts">
// Three small diagrams that explain the model at a glance — one distinct motion
// each, shown instead of a paragraph. Pure SVG + CSS: crisp in light and dark,
// still and readable under prefers-reduced-motion. Decorative — the captions
// carry the meaning.
//   1 (local)    — a scan line sweeps a plant inside your screen: recognition here.
//   2 (connect)  — dots leave the PC, outbound, up to verdure: it links itself.
//   3 (anywhere) — a photo arcs phone → verdure → PC, a result comes back.
const panels = ['local', 'connect', 'anywhere'] as const;
</script>

<template>
  <section aria-label="">
    <h2 class="text-highlighted mb-4 text-sm font-semibold">{{ $t('ai.activate.howTitle') }}</h2>

    <ul class="grid gap-4 sm:grid-cols-3">
      <li
        v-for="key in panels"
        :key="key"
        class="border-default/70 bg-elevated/30 flex flex-col gap-3 rounded-2xl border p-5"
      >
        <div class="flex h-24 items-center justify-center" aria-hidden="true">
          <!-- 1 — the AI runs on the user's own PC (scan) -->
          <svg v-if="key === 'local'" viewBox="0 0 140 96" class="h-full w-auto">
            <clipPath id="hiw-screen"><rect x="23" y="16" width="94" height="50" rx="4" /></clipPath>
            <g clip-path="url(#hiw-screen)">
              <g class="text-primary hiw-leaf-soft">
                <path
                  d="M64 30 C64 24 68 21 74 21 C74 27 70 30 64 30 Z"
                  fill="currentColor"
                  opacity="0.9"
                />
                <path d="M65.5 28.5 L72 23" stroke="currentColor" stroke-width="1.2" fill="none" />
              </g>
              <rect class="hiw-scan text-primary" x="23" y="0" width="94" height="3" fill="currentColor" />
            </g>
            <g class="text-dimmed" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
              <rect x="22" y="14" width="96" height="54" rx="6" />
              <path d="M60 68 v10 M48 84 h44" />
            </g>
          </svg>

          <!-- 2 — the PC links itself out to verdure (outbound dots) -->
          <svg v-else-if="key === 'connect'" viewBox="0 0 140 96" class="h-full w-auto">
            <path id="hiw-p2" d="M50 58 Q86 44 104 30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 5" class="text-primary" opacity="0.3" stroke-linecap="round" />
            <g class="text-dimmed" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
              <rect x="14" y="50" width="42" height="26" rx="4" />
              <path d="M35 76 v7 M26 90 h18" />
            </g>
            <!-- verdure node -->
            <g transform="translate(96,18)">
              <rect width="24" height="24" rx="8" fill="currentColor" class="text-primary" />
              <path d="M8 17 C8 11 12 8 17 8 C17 14 13 17 8 17 Z" fill="#dcfce7" />
            </g>
            <circle r="2.6" fill="currentColor" class="text-primary hiw-dot" style="offset-path: path('M50 58 Q86 44 104 30')" />
            <circle r="2.6" fill="currentColor" class="text-primary hiw-dot hiw-dot-b" style="offset-path: path('M50 58 Q86 44 104 30')" />
          </svg>

          <!-- 3 — the app anywhere, the AI at home (round-trip) -->
          <svg v-else viewBox="0 0 168 96" class="h-full w-auto">
            <path d="M30 52 Q84 4 138 52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 5" class="text-primary" opacity="0.3" stroke-linecap="round" />
            <g class="text-dimmed" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
              <!-- phone -->
              <rect x="16" y="50" width="24" height="38" rx="5" />
              <path d="M24 84 h8" />
              <!-- PC -->
              <rect x="120" y="54" width="38" height="24" rx="4" />
              <path d="M139 78 v6 M130 90 h18" />
            </g>
            <!-- verdure node at the apex -->
            <g transform="translate(72,10)">
              <rect width="24" height="24" rx="8" fill="currentColor" class="text-primary" />
              <path d="M8 17 C8 11 12 8 17 8 C17 14 13 17 8 17 Z" fill="#dcfce7" />
            </g>
            <!-- photo travelling phone -> verdure -> PC -->
            <rect class="hiw-photo text-primary" width="7" height="7" rx="1.5" fill="currentColor" style="offset-path: path('M30 52 Q84 4 138 52')" />
            <!-- result (tiny leaf) coming back PC -> verdure -> phone -->
            <path class="hiw-back text-primary" d="M0 5 C0 2 2 0 5 0 C5 3 3 5 0 5 Z" fill="currentColor" style="offset-path: path('M138 52 Q84 4 30 52')" />
          </svg>
        </div>

        <div class="flex flex-col gap-1">
          <h3 class="text-highlighted text-sm font-semibold">
            {{ $t(`ai.activate.hiw.${key}.title`) }}
          </h3>
          <p class="text-muted text-sm leading-relaxed">
            {{ $t(`ai.activate.hiw.${key}.desc`) }}
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
/* 1 — scan line sweeping the screen, and the leaf breathing under it. */
.hiw-scan {
  animation: hiw-scan 2.6s ease-in-out infinite;
}
.hiw-leaf-soft {
  animation: hiw-breathe 2.6s ease-in-out infinite;
  transform-origin: 68px 26px;
}
@keyframes hiw-scan {
  0% {
    transform: translateY(16px);
    opacity: 0;
  }
  12%,
  88% {
    opacity: 0.7;
  }
  50% {
    transform: translateY(63px);
  }
  100% {
    transform: translateY(16px);
    opacity: 0;
  }
}
@keyframes hiw-breathe {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

/* 2 — dots leaving the PC, outbound to verdure. */
.hiw-dot {
  animation: hiw-travel 1.9s linear infinite;
}
.hiw-dot-b {
  animation-delay: 0.95s;
}
@keyframes hiw-travel {
  0% {
    offset-distance: 0%;
    opacity: 0;
  }
  12%,
  88% {
    opacity: 1;
  }
  100% {
    offset-distance: 100%;
    opacity: 0;
  }
}

/* 3 — a photo out, a result back, offset in time. */
.hiw-photo {
  animation: hiw-trip 3.4s ease-in-out infinite;
}
.hiw-back {
  animation: hiw-trip 3.4s ease-in-out infinite;
  animation-delay: 1.7s;
}
@keyframes hiw-trip {
  0% {
    offset-distance: 0%;
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  46% {
    offset-distance: 100%;
    opacity: 1;
  }
  54%,
  100% {
    offset-distance: 100%;
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hiw-scan,
  .hiw-leaf-soft,
  .hiw-dot,
  .hiw-photo,
  .hiw-back {
    animation: none;
  }
  .hiw-scan,
  .hiw-back {
    opacity: 0;
  }
}
</style>
