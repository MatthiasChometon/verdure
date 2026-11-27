<script setup lang="ts">
// Light/dark toggle without Nuxt UI's button: both icons are in the markup and the `dark:` variant
// shows the right one, so it renders the same on the server and needs no state to paint.
const colorMode = useColorMode();
const toggle = (): void => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
};
</script>

<template>
  <UiPlainButton size="md" square :aria-label="$t('plant.layout.themeLabel')" @click="toggle">
    <UIcon name="i-lucide-moon" class="hidden size-5 shrink-0 dark:inline-block" />
    <UIcon name="i-lucide-sun" class="size-5 shrink-0 dark:hidden" />
  </UiPlainButton>
</template>
