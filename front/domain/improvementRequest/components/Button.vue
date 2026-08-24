<script setup lang="ts">
const { open } = useImprovement();
const { user } = useAuth();
</script>

<template>
  <!-- Offered only to somebody signed in, because the idea is filed under an
       account and answered at an address. Sits just above the bug button, same
       corner: the two feedback taps live together, told apart by icon and
       colour — a green lightbulb to suggest, a neutral bug to report. -->
  <ClientOnly>
    <UButton
      v-if="user !== null"
      icon="i-lucide-lightbulb"
      color="primary"
      variant="solid"
      size="sm"
      class="fixed right-4 bottom-20 z-30 rounded-full shadow-lg"
      :aria-label="$t('improvement.open')"
      :title="$t('improvement.open')"
      @click="open"
    />
  </ClientOnly>
</template>
