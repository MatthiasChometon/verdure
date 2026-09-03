<script setup lang="ts">
const { isAuthReady, isLoggedIn } = useAuth();
const { open: openAuthDialog } = useAuthDialog();
</script>

<template>
  <main id="content" class="mx-auto w-full max-w-3xl flex-1 px-6 pt-28 pb-10">
    <AiActivateSkeleton v-if="!isAuthReady" />
    <PlantSignInPrompt v-else-if="!isLoggedIn" @login="openAuthDialog" />
    <AiActivateContent v-else />
  </main>
</template>
