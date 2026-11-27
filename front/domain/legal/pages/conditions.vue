<script setup lang="ts">
defineI18nRoute({ paths: { fr: '/conditions', en: '/terms' } });
</script>

<template>
  <LazyLegalDocument namespace="terms" hydrate-never />
</template>
