<script setup lang="ts">
const year = new Date().getFullYear();
</script>

<template>
  <footer class="border-default/60 border-t">
    <div class="text-muted mx-auto max-w-5xl px-6 py-6 text-sm">
      {{ $t('plant.layout.footer') }} · © {{ year }}
    </div>
  </footer>
</template>
