<template>
  <svg viewBox="0 0 168 96" class="h-full w-auto">
    <path
      d="M30 52 Q84 4 138 52"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-dasharray="2 5"
      class="text-primary"
      opacity="0.3"
      stroke-linecap="round"
    />
    <g
      class="text-dimmed"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linejoin="round"
      stroke-linecap="round"
    >
      <rect x="16" y="50" width="24" height="38" rx="5" />
      <path d="M24 84 h8" />
      <rect x="120" y="54" width="38" height="24" rx="4" />
      <path d="M139 78 v6 M130 90 h18" />
    </g>
    <AiVerdureNode :x="72" :y="10" />
    <rect
      class="hiw-photo text-primary"
      width="7"
      height="7"
      rx="1.5"
      fill="currentColor"
      style="offset-path: path('M30 52 Q84 4 138 52')"
    />
    <path
      class="hiw-back text-primary"
      d="M0 5 C0 2 2 0 5 0 C5 3 3 5 0 5 Z"
      fill="currentColor"
      style="offset-path: path('M138 52 Q84 4 30 52')"
    />
  </svg>
</template>

<style scoped>
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
  .hiw-photo,
  .hiw-back {
    animation: none;
  }
  .hiw-back {
    opacity: 0;
  }
}
</style>
