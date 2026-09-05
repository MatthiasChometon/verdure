<template>
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
      <ellipse class="fp p1" cx="19" cy="8.6" rx="2.1" ry="4" transform="rotate(288 19 11)" />
      <ellipse class="fp p2" cx="19" cy="8.6" rx="2.1" ry="4" transform="rotate(216 19 11)" />
      <ellipse class="fp p3" cx="19" cy="8.6" rx="2.1" ry="4" />
      <ellipse class="fp p4" cx="19" cy="8.6" rx="2.1" ry="4" transform="rotate(144 19 11)" />
      <ellipse class="fp p5" cx="19" cy="8.6" rx="2.1" ry="4" transform="rotate(72 19 11)" />
    </g>
  </svg>
</template>

<style scoped>
/* Climbs the link's right side and arches above the label, where the flower
   blooms when active; stem base sits at the link's right edge. */
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

/* opacity:0 at rest also hides the round line-cap dot the retracted dash would
   otherwise leave; hover/active draws the stem up and unfurls the leaves. */
.v-stem {
  fill: none;
  stroke: color-mix(in oklab, var(--color-green-700) 60%, transparent);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 100; /* fully retracted at rest */
  opacity: 0;
  /* Retract: un-draws slowly (1.1s), opacity fades only at the very end so the
     line-cap dot never shows at rest. */
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
/* Base delays retract tip→base (leaves vanish in the stem's wake); the
   :hover/.active delays below grow base→tip (leaves sprout as it passes). */
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
