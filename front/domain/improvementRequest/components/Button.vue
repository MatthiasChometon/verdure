<script setup lang="ts">
const { open } = useImprovement();
const { user } = useAuth();
</script>

<template>
  <!-- Signed-in only: an idea is filed under an account, answered at an address.
       Sits above the bug button, same corner — told apart by icon/colour. -->
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
