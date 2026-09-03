<script setup lang="ts">
// A focused, full-screen landing reached from an email link — no app chrome.
definePageMeta({ layout: false });

const localePath = useLocalePath();
const { state } = useEmailVerification();
</script>

<template>
  <main
    class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
  >
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

    <template v-else>
      <UIcon name="i-lucide-circle-x" class="text-error size-12" aria-hidden="true" />
      <h1 class="text-highlighted text-xl font-semibold">{{ $t('auth.verify.errorTitle') }}</h1>
      <p class="text-muted text-sm">{{ $t('auth.verify.errorHint') }}</p>
      <UButton :to="localePath('/')" color="neutral" variant="subtle">
        {{ $t('auth.verify.home') }}
      </UButton>
    </template>
  </main>
</template>
