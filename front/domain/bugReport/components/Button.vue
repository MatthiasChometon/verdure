<script setup lang="ts">
const { open } = useBugReport();
const { user } = useAuth();
</script>

<template>
  <!-- Offered only to somebody signed in, because the report is filed under an
       account and answered at an address. Sat where the thumb already is — the
       point is to be there at the moment the problem happens, not to be
       findable later. -->
  <ClientOnly>
    <UButton
      v-if="user !== null"
      icon="i-lucide-bug"
      color="neutral"
      variant="solid"
      size="sm"
      class="fixed right-4 bottom-6 z-30 rounded-full shadow-lg"
      :aria-label="$t('bugReport.open')"
      :title="$t('bugReport.open')"
      @click="open"
    />
  </ClientOnly>
</template>
