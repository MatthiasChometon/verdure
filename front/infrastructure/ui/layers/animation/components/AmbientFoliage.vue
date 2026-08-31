<script setup lang="ts">
// Purely decorative ambient foliage for the cosy-jungle identity: real leaf
// silhouettes (monstera + a curling tropical leaf) anchored in the corners that
// slowly breathe, plus assorted leaves drifting across the scene. aria-hidden,
// non-interactive, behind all content, and fully stilled under
// prefers-reduced-motion (only the calm corner frame remains). SVG paths are
// traced from real leaves (CC0, svgrepo) so the shapes read as actual foliage;
// kept as inline SVG for crispness, theming (--foliage token) and offline/CSP.
// See front/DESIGN.md.

type Shape = { viewBox: string; d: string };
type ShapeName = 'monstera' | 'leaf' | 'fern';
const SHAPES: Record<ShapeName, Shape> = {
  monstera: {
    viewBox: '0 0 512 512',
    d: 'M332.9 17.37c-11.7-.1-24.2 1.23-37.5 4.13-33.1 7.21-48.6 28.49-56.2 54.09 11.2 22.86 20.1 46.01 25 71.91-9.6-6.9-19.7-1.7-22.6 5-4.3-22.4-10-42.9-17.8-62.93-48.8-34.88-83-20.9-89.6-18.76C49.64 98.12 25.54 165.7 39.84 239.1c19.32-43.4 86.56-68.7 113.56-68.6 6.9.1 47 9.5 13.6 20-54.8 17.3-98.29 48.7-116.81 86 8.78 24.5 21.34 49.1 36.89 72.4 14.42-42 40.22-89 96.72-125.1 14.5-9.3 23.8.7 12.2 13.2-53.5 57.4-75.1 104.2-81 148.6 17.4 20.3 37.2 38.9 58.5 54.7 1.6-54.4 20.3-117.7 56.3-164.6 3.7-6.6 22-2.7 15.6 9-27.9 50.9-43.2 119.9-44.5 174 25.6 15.2 52.9 26.3 80.9 31.9-15.1-35.2-18.5-80.5-6.9-120.8 5.1-17.8 20.8-8.1 17.6 4.2-10 38.8 8.6 87.5 28.1 120.6 20.7.1 41.6-3.1 62.3-10.2 11.8-4 22.7-12.3 32.7-23.8-11.3-22.8-27-44.1-46.6-57.2-7.4-5-3.2-23.6 10.2-14.8 19.1 12.6 37.6 29.7 52.8 48.7 9.8-16.8 18.2-37 25-59.4-29.7-34.7-83.3-82-128.8-101.7-9.6-4.1-8.7-21.5 7.6-16.4 47.8 14.8 98 46.2 131.1 78 3.9-19.9 6.7-40.8 8.1-61.9-39-27.6-95.5-67.2-147.1-74.8-9.5-1.4-13.6-18.6 3-17.8 58.3 2.7 109.8 23.5 145.1 50.5-.5-28.6-3.6-56.7-9.7-82.9-41.7-13.6-113.5-18.5-141.5-6.1-11.1 4.9-29.9-4.8-6.8-16.6 37.6-22.1 94.5-22.8 138.3-11-21.3-57.97-60.7-99.32-123.4-99.83z',
  },
  leaf: {
    viewBox: '0 0 1024 1024',
    d: 'M450.72 418.17c-42.29-21.86-144.5-220-171.65-198.22s-40.59 114.28 0.29 171.31 132 97 153.52 129.58 18.45 57.07 13.36 63.2S262.49 462 217.66 485.53s-28.41 84.69 17.56 132.54S427 651.39 455.57 672.76s32.72 55 20.49 55-145.88-32.38-192.77-24.15-68.25 39.89 0.12 73.42 180.26 8.87 199.28 28.21 6.8 28.54-7.47 29.58-110.14-4.91-143.78 0.24 6.21 56.07 23.57 69.3 80.59 19.24 98.94 16.15 36.67-26.58 51-20.48 3.14 45.88 8.25 53 46.92 9.1 53-0.09-10.26-37.71-0.09-51 32.65 11.16 66.28-1.13 109-70.55 111-104.2-132.52 27.76-167.19 26.8c-24.48-4-34.71-21.36-19.43-30.56s228.33-55.45 244.57-96.27 4-34.68-21.47-34.63S605.6 724.45 590.26 700 791 610 813.3 555.9s29.37-119.36-0.22-127.47-147.62 137.92-194.54 130.86-1.06-21.41 19.29-48 132.36-120.51 133.32-154.16 10.08-67.32-27.65-71.33-129.27 135.84-149.69 123.63 52.89-78.61 64-143.89S632.09 133 611.7 137.14s-19.37 4.11-19.34 22.47 10.33 79.52-1.85 114.21-13.14 60.18-23.35 54.08-10.27-43.83-4.2-73.41 23.3-92.83 13.07-112.19S545.27 48.53 467.8 68s-72.25 89.86-65 136.75 27.67 83.57 45.09 128.41 21.71 94.77 2.83 85.01z',
  },
  fern: {
    viewBox: '0 0 512 512',
    d: 'M127.3 21.33c-8.7 3.74-15.7 8.57-21.9 14.01 2.5 4.7 5.1 9.41 7.7 14.15 7-9.07 12.3-19.08 14.2-28.16zM48.18 35.86c-5.47.1-11.12.85-17.01 2.59 10 10.35 26.54 17.43 42.18 19.64-2.11-6.66-4.07-13.27-5.87-19.82-6.24-1.52-12.63-2.5-19.3-2.41zm37.84 1.07C108.6 116.3 155.9 207.1 214 288.5c62.5 87.4 137.5 164 205.5 205.5h72c-164.8-99-318-289.6-405.48-457.07zm65.58.6c-13.3 5.97-23.5 14.12-32.2 23.3 3.4 5.95 6.8 11.92 10.3 17.9 10.7-12.79 19.2-27.8 21.9-41.2zm36.6 10.95c-22.2 10.69-37.1 26.96-49.9 44.61 4.1 6.72 8.2 13.41 12.5 20.21 17.8-18 33.2-43.11 37.4-64.82zM47.86 68.68c-7.31 0-14.87.83-22.77 2.76C39.3 83.57 63.75 91.51 85.6 92.93c-2.62-6.81-5.09-13.58-7.42-20.31-9.76-2.33-19.78-3.97-30.32-3.94zm174.64 9.48c-27.8 10.8-45.5 30.34-61.8 50.54 3.5 5.4 7.1 10.8 10.7 16.2 22.4-15.8 44.3-42.9 51.1-66.74zm28.1 25.94c-31.5 13.4-50.6 35-67.8 57.6 4.3 6.2 8.7 12.4 13.1 18.5 25.3-18.7 49-49.8 54.7-76.1zm-188.95 1.7c-13.6.1-27.46 2.2-41.65 7.7 20.75 13 53.96 18.8 81 16.3-3.28-7.3-6.4-14.5-9.38-21.7-9-1.3-18.07-2.2-27.25-2.3zm217.95 33.5c-32.7 13.9-52 36.7-69.7 60.2 4.3 5.8 8.7 11.6 13.1 17.3 26.1-18.4 50.7-50.5 56.6-77.5zm-185.3 3.3c-21.73.1-43.47 2.5-64.55 14.4 23.57 10.2 59.64 10.3 85.15 2.3-2.7-5.5-5.4-11.1-8-16.6-2.7-.1-5.5-.1-8.25-.1zm219.1 23.7c-35.5 15.8-57.7 40.9-77.3 67.3 6 7.7 12.2 15.4 18.5 23 27.7-23.8 52.5-59.6 58.8-90.3zm-194.5 16.2c-26.84-.1-54.08 2.3-82.42 17.9 26.28 12.8 69.92 12.3 101.12 1.6-3.7-6.5-7.2-12.9-10.7-19.4-2.7-.1-5.3-.1-8-.1zm236.3 17.3c-39.6 17.7-62.6 46.7-84 76.5 5.8 6.7 11.6 13.4 17.5 20 30.7-23.4 59.6-63 66.5-96.5zm-220.3 19.4c-26.8 0-54.11 2.3-82.43 17.9 27.65 13.4 74.43 12.3 105.73-.1-3.6-5.8-7.1-11.7-10.6-17.6-4.2-.1-8.4-.2-12.7-.2zm261.6 8.4c-43.5 19.8-68.7 52.4-92.2 85.9 6.7 7.1 13.4 14.2 20.2 21.2 33.4-26.1 64.5-69.9 72-107.1zm45.2 27.5c-49.1 23.2-75.2 59.8-100.4 96.5 6.7 6.6 13.5 13.2 20.3 19.6 37.7-27.1 73.5-76 80.1-116.1zm-270.9 1.8c-36.9 1.5-74.06 4.6-110.83 28.2 34.33 13.8 88.63 9.8 125.63-5.8-5-7.4-10-14.9-14.8-22.4zM486.3 280c-51 26.5-77.5 68.7-103.4 110.6 7.4 6.6 14.9 13.1 22.5 19.4 38.1-30.4 74.2-85 80.9-130zm-283.6 23.5c-40.4 3.3-81.2 6.4-120.44 34.1 37.84 13.2 98.04 4.6 133.74-15.9-4.5-6-8.9-12.1-13.3-18.2zM494 342.6c-32.9 25.6-48.1 51.6-68.4 83.8 8.8 6.9 17.6 13.6 26.5 20 17.5-14.4 28.2-33.1 41.9-53.3zm-257.2 5.7c-42.1 9.6-84.4 19.9-121 54.6 41.5 7.9 101.6-8.3 138.2-33.7-5.8-6.8-11.6-13.8-17.2-20.9zm35.5 41.9c-41.7 14.1-83.6 29.4-118.8 69.8 42.1 4.8 101.9-18.4 138-49.1-6.5-6.7-12.9-13.7-19.2-20.7zm45.4 46.9c-43.1 10.9-86.1 23.1-123.5 56.9h70.6c28.5-7.5 56.2-20 76.9-35-8-7-16-14.3-24-21.9zm46.4 40.4c-15.6 4.9-31.3 10-46.6 16.5h68.8c-7.4-5.2-14.8-10.7-22.2-16.5z',
  },
};

type Corner = { shape: ShapeName; pos: string; rotate: number; scale: number; tx: number; ty: number; sway: number };
// Each leaf grows IN from its corner: `rotate` aims the blade at the centre while
// the stem points outward, and `tx/ty` (% of the leaf) push it toward its corner
// so the stem sits on the edge and bleeds off it. Rotations come from each shape's
// natural orientation (monstera stem = bottom; fern base = bottom-right).
const corners: Corner[] = [
  // One clear silhouette per zone — never two overlapping. Asymmetric on purpose
  // (fern at BL not a monstera, plus two off-corner accents) for a looser feel.
  // tx/ty place the STEM (the transform-origin, per shape below) on the edge, so
  // the wind sway pivots at the stem base like a real leaf.
  // tx/ty push each leaf toward its edge (centre-origin) so the stem sits on the
  // border with the blade toward the centre. The sway pivot lives on the inner
  // <svg> (transform-origin = stem) so placement stays intact.
  { shape: 'monstera', pos: 'top-0 left-0', rotate: -45, scale: 0.78, tx: -36, ty: -36, sway: 7 },
  { shape: 'monstera', pos: 'top-0 right-0', rotate: 45, scale: 0.74, tx: 36, ty: -36, sway: 8 },
  { shape: 'monstera', pos: 'bottom-0 right-0', rotate: 135, scale: 0.78, tx: 36, ty: 36, sway: 7.5 },
  { shape: 'fern', pos: 'bottom-0 left-0', rotate: 90, scale: 0.56, tx: -38, ty: 38, sway: 9 },
  // Accents only on the WIDE top/bottom edges, mid-span — the short left/right
  // edges are filled by the corners, so an accent there always overlaps them.
  { shape: 'monstera', pos: 'top-0 left-[52%]', rotate: 0, scale: 0.38, tx: 0, ty: -36, sway: 6.5 },
  { shape: 'leaf', pos: 'bottom-0 left-[44%]', rotate: 0, scale: 0.48, tx: 0, ty: 36, sway: 7 },
];

type Drifter = { shape: ShapeName; top: string; size: number; duration: number; delay: number; opacity: number; rotate: number; arc: number };
// `arc` (px) is how far the path bows vertically mid-crossing — gives each leaf a
// curved trajectory (some arc up, some down). `rotate` is the resting angle.
// Negative delays spread them across the scene at first paint.
const drifters: Drifter[] = [
  { shape: 'monstera', top: '16%', size: 32, duration: 66, delay: -4, opacity: 0.14, rotate: 12, arc: 120 },
  { shape: 'leaf', top: '40%', size: 22, duration: 72, delay: -34, opacity: 0.13, rotate: 190, arc: 140 },
  { shape: 'fern', top: '64%', size: 28, duration: 76, delay: -18, opacity: 0.12, rotate: 200, arc: -120 },
  { shape: 'monstera', top: '84%', size: 26, duration: 60, delay: -46, opacity: 0.14, rotate: 18, arc: -100 },
];

type Scatter = { shape: ShapeName; top: string; left: string; size: number; rotate: number; opacity: number };
// Assorted leaves hugging the four edges, each turned so its blade points IN
// toward the centre (stem on the border, bleeding off — like the corner fronds).
// The rotation per leaf = the turn that aims its shape's natural blade
// (monstera → down, leaf → up, fern → up-left) at the centre from that edge,
// with a few degrees of jitter so they don't line up. Static, low opacity.
const scatter: Scatter[] = [
  // Top edge — blade points DOWN
  { shape: 'leaf', top: '0%', left: '24%', size: 96, rotate: 172, opacity: 0.07 },
  { shape: 'fern', top: '0%', left: '63%', size: 88, rotate: 232, opacity: 0.06 },
  { shape: 'monstera', top: '0%', left: '83%', size: 78, rotate: -8, opacity: 0.06 },
  // Bottom edge — blade points UP
  { shape: 'monstera', top: '100%', left: '33%', size: 116, rotate: 184, opacity: 0.05 },
  { shape: 'leaf', top: '100%', left: '60%', size: 92, rotate: -6, opacity: 0.07 },
  { shape: 'fern', top: '100%', left: '78%', size: 96, rotate: 50, opacity: 0.06 },
  // Left edge — blade points RIGHT
  { shape: 'leaf', top: '38%', left: '0%', size: 90, rotate: 96, opacity: 0.07 },
  { shape: 'fern', top: '66%', left: '0%', size: 104, rotate: 132, opacity: 0.06 },
  // Right edge — blade points LEFT
  { shape: 'monstera', top: '32%', left: '100%', size: 92, rotate: 84, opacity: 0.06 },
  { shape: 'leaf', top: '61%', left: '100%', size: 84, rotate: 274, opacity: 0.07 },
];

// Where the stem sits in each shape's viewBox — used as the transform-origin so
// the wind sway pivots at the stem base (like a real leaf), not the leaf centre.
const STEM: Record<ShapeName, string> = {
  monstera: '50% 2%', // stem = the top notch
  leaf: '50% 98%', // stem = the bottom
  fern: '82% 86%', // base = bottom-right
};
</script>

<template>
  <div class="foliage" aria-hidden="true">
    <!-- Corner/edge fronds: anchored at the stem on the edge, swaying with the
         breeze (the sway pivots at the stem via transform-origin). -->
    <div
      v-for="(corner, i) in corners"
      :key="`c${i}`"
      class="frond"
      :class="corner.pos"
      :style="{
        '--rotate': `${corner.rotate}deg`,
        '--scale': corner.scale,
        '--tx': `${corner.tx}%`,
        '--ty': `${corner.ty}%`,
      }"
    >
      <svg
        class="frond-leaf"
        :viewBox="SHAPES[corner.shape].viewBox"
        :style="{ transformOrigin: STEM[corner.shape], animationDelay: `${i * -0.5}s` }"
      >
        <path :d="SHAPES[corner.shape].d" />
      </svg>
    </div>

    <!-- Leaves carried on the breeze: the outer span drifts left→right, the inner
         leaf loops + turns in gusts synced (same period) to the fronds' sway, so
         the wind reads as one coherent, regular puff. -->
    <span
      v-for="(leaf, i) in drifters"
      :key="`d${i}`"
      class="drifter"
      :style="{
        top: leaf.top,
        '--o': leaf.opacity,
        '--arc': `${leaf.arc}px`,
        animationDuration: `${leaf.duration}s`,
        animationDelay: `${leaf.delay}s`,
      }"
    >
      <svg
        class="drifter-leaf"
        :viewBox="SHAPES[leaf.shape].viewBox"
        :style="{
          width: `${leaf.size}px`,
          height: `${leaf.size}px`,
          '--rot': `${leaf.rotate}deg`,
          animationDelay: `${i * -0.6}s`,
        }"
      >
        <path :d="SHAPES[leaf.shape].d" />
      </svg>
    </span>

    <!-- Assorted leaves of every size strewn across the mid-field: static
         placement, a gentle shared-gust sway, filling the empty space. -->
    <div
      v-for="(s, i) in scatter"
      :key="`s${i}`"
      class="scatter"
      :style="{ top: s.top, left: s.left, width: `${s.size}px`, height: `${s.size}px`, '--rotate': `${s.rotate}deg`, '--o': s.opacity }"
    >
      <svg
        class="scatter-leaf"
        :viewBox="SHAPES[s.shape].viewBox"
        :style="{ transformOrigin: STEM[s.shape], animationDelay: `${i * -0.7}s` }"
      >
        <path :d="SHAPES[s.shape].d" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.foliage {
  position: fixed;
  inset: 0;
  z-index: -10;
  pointer-events: none;
  overflow: clip;
  /* Fallbacks so a first paint before the tokens load never flashes opaque black. */
  color: rgb(var(--foliage, 36, 91, 60));
  /* One shared gust period: the fronds' sway and the drifting leaves' loops both
     run on it, so the wind reads as one coherent, regular puff. */
  --gust: 4.5s;
}

.foliage path {
  fill: currentColor;
}

/* Corner/edge fronds — large, faint, anchored at the stem. */
/* Outer layer: places the leaf (stem on the edge, blade toward centre). */
.frond {
  position: absolute;
  width: clamp(180px, 32vw, 460px);
  height: clamp(180px, 32vw, 460px);
  opacity: var(--foliage-strength, 0.09);
  transform: translate(var(--tx), var(--ty)) rotate(var(--rotate)) scale(var(--scale));
}

/* Inner layer: sways in the breeze, pivoting at the STEM (transform-origin set
   per shape inline), so the base stays pinned to the edge. Runs on --gust, the
   shared wind period; gentle amplitude. */
.frond-leaf {
  display: block;
  width: 100%;
  height: 100%;
  will-change: transform;
}

@media (prefers-reduced-motion: no-preference) {
  .frond-leaf {
    animation: sway var(--gust) ease-in-out infinite;
  }
}

@keyframes sway {
  0% {
    transform: rotate(0deg);
  }
  35% {
    transform: rotate(5deg);
  }
  70% {
    transform: rotate(-2deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

/* Scattered mid-field leaves: outer div places + rotates them, inner svg sways
   on the shared gust like the corner fronds. */
.scatter {
  position: absolute;
  opacity: var(--o);
  transform: translate(-50%, -50%) rotate(var(--rotate));
}

/* Static on purpose: they're background texture. Keeping them still (while the
   corners + drifters carry the motion) keeps the animated-node count low so the
   scene never bogs the renderer down. */
.scatter-leaf {
  display: block;
  width: 100%;
  height: 100%;
}

/* Outer: carries the leaf steadily left → right, fading in/out at the edges.
   Hidden entirely when motion is reduced. */
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
  /* Inner: a small looping curl of the path + one turn, once per --gust — the
     same period as the fronds' sway, so gusts feel coherent and regular. */
  .drifter-leaf {
    display: block;
    animation: gust var(--gust) linear infinite;
    will-change: transform;
  }
}

@media (prefers-reduced-motion: reduce) {
  .drifter {
    display: none;
  }
}

@keyframes drift {
  0% {
    transform: translate(-14vw, 0);
    opacity: 0;
  }
  6% {
    opacity: var(--o);
  }
  25% {
    transform: translate(18vw, calc(var(--arc) * 0.6));
  }
  50% {
    transform: translate(51vw, var(--arc));
  }
  75% {
    transform: translate(84vw, calc(var(--arc) * 0.6));
  }
  94% {
    opacity: var(--o);
  }
  100% {
    transform: translate(116vw, 0);
    opacity: 0;
  }
}

/* One gust: the leaf traces a small loop and turns once. Superimposed on the
   steady drift, the trajectory does light loops. */
@keyframes gust {
  0% {
    transform: translate(0, 0) rotate(var(--rot));
  }
  25% {
    transform: translate(-13px, -13px) rotate(calc(var(--rot) + 90deg));
  }
  50% {
    transform: translate(-2px, -24px) rotate(calc(var(--rot) + 180deg));
  }
  75% {
    transform: translate(13px, -13px) rotate(calc(var(--rot) + 270deg));
  }
  100% {
    transform: translate(0, 0) rotate(calc(var(--rot) + 360deg));
  }
}
</style>
