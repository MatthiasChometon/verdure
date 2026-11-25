<script setup lang="ts">
defineI18nRoute({ paths: { fr: '/mentions-legales', en: '/legal-notice' } });
</script>

<template>
  <LazyLegalDocument namespace="notice" hydrate-never />
</template>
