<script setup lang="ts">
defineI18nRoute({ paths: { fr: '/confidentialite', en: '/privacy' } });
</script>

<template>
  <LazyLegalDocument namespace="privacy" hydrate-never />
</template>
