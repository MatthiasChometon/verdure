<script setup lang="ts">
// Purely decorative ambient foliage for the cosy-jungle identity: fronds anchored
// in the corners that slowly breathe, plus a few leaves drifting across the scene.
// It is aria-hidden and non-interactive, sits behind all content, and is fully
// stilled under prefers-reduced-motion (only the calm corner frame remains).
// SVG (not raster/WebP) keeps it crisp, tiny, theme-aware (--foliage token) and
// offline-friendly under the strict CSP. See front/DESIGN.md.

type Corner = { class: string; rotate: number; scale: number; sway: number };
const corners: Corner[] = [
  { class: 'top-0 left-0 origin-top-left', rotate: -18, scale: 1, sway: 11 },
  { class: 'top-0 right-0 origin-top-right -scale-x-100', rotate: -12, scale: 0.85, sway: 13 },
  { class: 'bottom-0 right-0 origin-bottom-right', rotate: 168, scale: 0.95, sway: 12 },
  { class: 'bottom-0 left-0 origin-bottom-left -scale-x-100', rotate: 168, scale: 0.7, sway: 14 },
];

type Drifter = { top: string; size: number; duration: number; delay: number; opacity: number };
// Negative delays spread them across the scene at first paint (no empty warm-up).
const drifters: Drifter[] = [
  { top: '14%', size: 22, duration: 52, delay: 0, opacity: 0.12 },
  { top: '30%', size: 15, duration: 68, delay: -16, opacity: 0.09 },
  { top: '52%', size: 28, duration: 58, delay: -34, opacity: 0.13 },
  { top: '70%', size: 18, duration: 74, delay: -9, opacity: 0.1 },
  { top: '86%', size: 24, duration: 63, delay: -44, opacity: 0.11 },
];
</script>

<template>
  <div class="foliage" aria-hidden="true">
    <!-- Corner fronds: a soft living frame around the content column. -->
    <svg
      v-for="(corner, i) in corners"
      :key="`c${i}`"
      class="frond"
      :class="corner.class"
      viewBox="0 0 64 64"
      :style="{
        '--rotate': `${corner.rotate}deg`,
        '--scale': corner.scale,
        animationDuration: `${corner.sway}s`,
      }"
    >
      <path
        d="M32 3 C 51 15, 59 39, 32 61 C 5 39, 13 15, 32 3 Z"
        class="leaf-fill"
      />
      <path d="M32 9 L 32 55" class="leaf-vein" />
      <path d="M32 22 L 44 17 M32 22 L 20 17 M32 34 L 47 30 M32 34 L 17 30" class="leaf-vein" />
    </svg>

    <!-- Leaves drifting across the scene. -->
    <svg
      v-for="(leaf, i) in drifters"
      :key="`d${i}`"
      class="drifter"
      viewBox="0 0 64 64"
      :style="{
        top: leaf.top,
        width: `${leaf.size}px`,
        height: `${leaf.size}px`,
        '--o': leaf.opacity,
        animationDuration: `${leaf.duration}s`,
        animationDelay: `${leaf.delay}s`,
      }"
    >
      <path d="M32 3 C 51 15, 59 39, 32 61 C 5 39, 13 15, 32 3 Z" class="leaf-fill" />
      <path d="M32 9 L 32 55" class="leaf-vein" />
    </svg>
  </div>
</template>

<style scoped>
.foliage {
  position: fixed;
  inset: 0;
  z-index: -10;
  pointer-events: none;
  overflow: clip;
  color: rgb(var(--foliage));
}

.leaf-fill {
  fill: currentColor;
}

.leaf-vein {
  stroke: rgb(var(--canopy-page));
  stroke-width: 1.4;
  fill: none;
  opacity: 0.5;
  stroke-linecap: round;
}

/* Corner fronds — large, faint, gently breathing. */
.frond {
  position: absolute;
  width: clamp(200px, 34vw, 460px);
  height: clamp(200px, 34vw, 460px);
  opacity: var(--foliage-strength);
  transform: rotate(var(--rotate)) scale(var(--scale));
  will-change: transform;
}

@media (prefers-reduced-motion: no-preference) {
  .frond {
    animation: sway ease-in-out infinite;
  }
}

@keyframes sway {
  0%,
  100% {
    transform: rotate(var(--rotate)) scale(var(--scale));
  }
  50% {
    transform: rotate(calc(var(--rotate) + 2.5deg)) scale(calc(var(--scale) * 1.015));
  }
}

/* Drifting leaves — cross the scene slowly, bobbing, then off the far edge.
   Hidden entirely when motion is reduced (they'd otherwise sit frozen mid-air). */
.drifter {
  position: absolute;
  left: 0;
  opacity: 0;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: no-preference) {
  .drifter {
    animation: drift linear infinite;
  }
}

@media (prefers-reduced-motion: reduce) {
  .drifter {
    display: none;
  }
}

@keyframes drift {
  0% {
    transform: translate(-12vw, 0) rotate(-6deg);
    opacity: 0;
  }
  8% {
    opacity: var(--o);
  }
  50% {
    transform: translate(50vw, -22px) rotate(9deg);
  }
  92% {
    opacity: var(--o);
  }
  100% {
    transform: translate(112vw, 0) rotate(-6deg);
    opacity: 0;
  }
}
</style>
