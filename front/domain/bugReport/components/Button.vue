<script setup lang="ts">
const { open } = useBugReport();
const { user } = useAuth();
</script>

<template>
  <!-- Signed-in only: a report is filed under an account, answered at an address.
       Sat where the thumb already is — reachable the moment the problem happens. -->
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
