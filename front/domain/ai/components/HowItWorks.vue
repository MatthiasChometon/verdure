<script setup lang="ts">
// Three small diagrams that explain the model at a glance — one distinct motion
// each, shown instead of a paragraph. Pure SVG + CSS: crisp in light and dark,
// still and readable under prefers-reduced-motion. Decorative — the captions
// carry the meaning. Each panel's diagram lives in its own component
// (how-it-works/*Diagram.vue): local (a scan sweeps a plant on-screen),
// connect (dots leave the PC outbound to verdure) and anywhere (a photo arcs
// phone → verdure → PC, a result comes back).
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
          <AiLocalDiagram v-if="key === 'local'" />
          <AiConnectDiagram v-else-if="key === 'connect'" />
          <AiAnywhereDiagram v-else />
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
