<script setup lang="ts">
const { perks } = useActivateContent();
</script>

<template>
  <ul class="flex flex-wrap gap-2.5">
    <li
      v-for="perk in perks"
      :key="perk.key"
      class="border-default/70 bg-elevated/40 flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm"
    >
      <UIcon :name="perk.icon" class="text-primary size-4 shrink-0" aria-hidden="true" />
      <span class="text-highlighted font-medium">
        {{ $t(`ai.activate.perks.${perk.key}.title`) }}
      </span>
    </li>
  </ul>
</template>
