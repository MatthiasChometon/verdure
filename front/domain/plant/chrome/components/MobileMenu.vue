<script setup lang="ts">
defineProps<{ items: HeaderNavItem[] }>();

const open = defineModel<boolean>('open', { required: true });
</script>

<template>
  <!-- Mobile (<900px) menu: the same destinations as plain links. -->
  <USlideover
    v-model:open="open"
    side="left"
    :title="$t('plant.layout.brand')"
    :ui="{ content: 'max-w-72' }"
  >
    <template #body>
      <nav class="flex flex-col gap-1" :aria-label="$t('plant.layout.navLabel')">
        <NuxtLinkLocale
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="m-link"
          :class="{ 'm-active': item.active }"
          @click="open = false"
        >
          <UIcon :name="item.icon" class="size-5 shrink-0" aria-hidden="true" />
          {{ item.label }}
        </NuxtLinkLocale>
      </nav>
    </template>
  </USlideover>
</template>

<style scoped>
/* Mobile menu links inside the burger slideover (<900px) — plain, comfortable
   tap targets; no vines. */
.m-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.5rem;
  padding: 0.65rem 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.m-link:hover {
  background-color: var(--ui-bg-elevated);
  color: var(--ui-text-highlighted);
}
.m-active {
  color: var(--color-green-700);
  background-color: color-mix(in oklab, var(--color-green-500) 12%, transparent);
}
.dark .m-active {
  color: var(--color-green-300);
}
</style>
