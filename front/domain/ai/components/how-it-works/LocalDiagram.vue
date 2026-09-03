<template>
  <svg viewBox="0 0 140 96" class="h-full w-auto">
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
    <g
      class="text-dimmed"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linejoin="round"
      stroke-linecap="round"
    >
      <rect x="22" y="14" width="96" height="54" rx="6" />
      <path d="M60 68 v10 M48 84 h44" />
    </g>
  </svg>
</template>

<style scoped>
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

@media (prefers-reduced-motion: reduce) {
  .hiw-scan,
  .hiw-leaf-soft {
    animation: none;
  }
  .hiw-scan {
    opacity: 0;
  }
}
</style>
