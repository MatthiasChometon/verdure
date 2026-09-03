<template>
  <svg viewBox="0 0 140 96" class="h-full w-auto">
    <path
      id="hiw-p2"
      d="M50 58 Q86 44 104 30"
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
      <rect x="14" y="50" width="42" height="26" rx="4" />
      <path d="M35 76 v7 M26 90 h18" />
    </g>
    <AiVerdureNode :x="96" :y="18" />
    <circle
      r="2.6"
      fill="currentColor"
      class="text-primary hiw-dot"
      style="offset-path: path('M50 58 Q86 44 104 30')"
    />
    <circle
      r="2.6"
      fill="currentColor"
      class="text-primary hiw-dot hiw-dot-b"
      style="offset-path: path('M50 58 Q86 44 104 30')"
    />
  </svg>
</template>

<style scoped>
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

@media (prefers-reduced-motion: reduce) {
  .hiw-dot {
    animation: none;
  }
}
</style>
