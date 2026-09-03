<script setup lang="ts">
const { capabilities } = useActivateContent();
</script>

<template>
  <section aria-labelledby="capabilities-title" class="mb-14">
    <h2 id="capabilities-title" class="text-highlighted mb-4 text-base font-semibold">
      {{ $t('ai.activate.capabilities.title') }}
    </h2>
    <ul class="grid gap-3 sm:grid-cols-3">
      <li
        v-for="capability in capabilities"
        :key="capability.key"
        class="border-default/70 bg-elevated/30 flex flex-col gap-2 rounded-2xl border p-4"
      >
        <span class="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
          <UIcon :name="capability.icon" class="size-5" aria-hidden="true" />
        </span>
        <span class="text-highlighted text-sm font-semibold">
          {{ $t(`ai.activate.capabilities.items.${capability.key}.title`) }}
        </span>
        <span class="text-muted text-sm">
          {{ $t(`ai.activate.capabilities.items.${capability.key}.desc`) }}
        </span>
      </li>
    </ul>
  </section>
</template>
