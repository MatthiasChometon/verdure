<script setup lang="ts">
// The app chrome — header (with its sign-in dialog) and footer — lives here so
// it stays mounted across navigations. Rendering it per-page made the header
// remount on every route change, which flashed its height for a frame.
const { isOpen } = useAuthDialog();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a href="#content" class="skip-link">{{ $t('accessibility.skip') }}</a>
    <PlantHeader v-model:open="isOpen" />
    <slot />
    <PlantFooter />
  </div>
</template>
