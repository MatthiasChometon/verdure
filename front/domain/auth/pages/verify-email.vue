<script setup lang="ts">
// A focused, full-screen landing reached from an email link — no app chrome.
definePageMeta({ layout: false });

const localePath = useLocalePath();
const { state } = useEmailVerification();
const { t } = useNuxtApp().$i18n;

// What a screen reader hears; the error outcome announces itself through its own role="alert".
const announcement = computed((): string => {
  if (state.value === 'pending') {
    return t('auth.verify.pending');
  }
  return state.value === 'success' ? t('auth.verify.successTitle') : '';
});
</script>

<template>
  <main
    class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
  >
    <!-- Persistent, so each outcome is announced when it replaces the previous one. -->
    <p class="sr-only" role="status">{{ announcement }}</p>

    <template v-if="state === 'pending'">
      <UIcon
        name="i-lucide-loader-circle"
        class="text-primary size-10 animate-spin"
        aria-hidden="true"
      />
      <p class="text-muted">{{ $t('auth.verify.pending') }}</p>
    </template>

    <template v-else-if="state === 'success'">
      <UIcon name="i-lucide-circle-check" class="text-primary size-12" aria-hidden="true" />
      <h1 class="text-highlighted text-xl font-semibold">{{ $t('auth.verify.successTitle') }}</h1>
      <p class="text-muted text-sm">{{ $t('auth.verify.successHint') }}</p>
    </template>

    <div v-else role="alert" class="flex flex-col items-center gap-4">
      <UIcon name="i-lucide-circle-x" class="text-error size-12" aria-hidden="true" />
      <h1 class="text-highlighted text-xl font-semibold">{{ $t('auth.verify.errorTitle') }}</h1>
      <p class="text-muted text-sm">{{ $t('auth.verify.errorHint') }}</p>
      <UButton :to="localePath('/')" color="neutral" variant="subtle">
        {{ $t('auth.verify.home') }}
      </UButton>
    </div>
  </main>
</template>
