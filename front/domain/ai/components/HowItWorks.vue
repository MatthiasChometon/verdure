<script setup lang="ts">
// Three SVG+CSS diagrams (how-it-works/*Diagram.vue) explaining the model at a glance —
// decorative and reduced-motion safe; the captions carry the actual meaning.
const { panels } = useActivateContent();
</script>

<template>
  <section aria-labelledby="how-it-works-title">
    <h2 id="how-it-works-title" class="text-highlighted mb-4 text-sm font-semibold">
      {{ $t('ai.activate.howTitle') }}
    </h2>

    <ul class="grid gap-4 sm:grid-cols-3">
      <li
        v-for="panel in panels"
        :key="panel.key"
        class="border-default/70 bg-elevated/30 flex flex-col gap-3 rounded-2xl border p-5"
      >
        <div class="flex h-24 items-center justify-center" aria-hidden="true">
          <AiLocalDiagram v-if="panel.key === 'local'" />
          <AiConnectDiagram v-else-if="panel.key === 'connect'" />
          <AiAnywhereDiagram v-else />
        </div>

        <div class="flex flex-col gap-1">
          <h3 class="text-highlighted text-sm font-semibold">
            {{ panel.title() }}
          </h3>
          <p class="text-muted text-sm leading-relaxed">
            {{ panel.desc() }}
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>
