<script setup lang="ts">
const localePath = useLocalePath();
const { password, hasToken, done, hasError, isSubmitting, submit } = useResetPassword();
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
    <div v-if="!hasToken" class="flex flex-col items-center gap-3 text-center">
      <UIcon name="i-lucide-circle-x" class="text-error size-12" aria-hidden="true" />
      <h1 class="text-highlighted text-xl font-semibold">{{ $t('auth.reset.invalidTitle') }}</h1>
      <p class="text-muted text-sm">{{ $t('auth.reset.invalidHint') }}</p>
      <UButton :to="localePath('/')" color="neutral" variant="subtle">
        {{ $t('auth.reset.home') }}
      </UButton>
    </div>

    <div v-else-if="done" class="flex flex-col items-center gap-3 text-center">
      <UIcon name="i-lucide-circle-check" class="text-primary size-12" aria-hidden="true" />
      <h1 class="text-highlighted text-xl font-semibold">{{ $t('auth.reset.successTitle') }}</h1>
      <p class="text-muted text-sm">{{ $t('auth.reset.successHint') }}</p>
    </div>

    <form v-else class="flex w-full flex-col gap-4" @submit.prevent="submit">
      <h1 class="text-highlighted text-center text-xl font-semibold">{{ $t('auth.reset.title') }}</h1>
      <UFormField
        :label="$t('auth.reset.password')"
        :hint="$t('auth.dialog.passwordHint')"
        required
      >
        <UInput
          v-model="password"
          type="password"
          autocomplete="new-password"
          :minlength="8"
          enterkeyhint="go"
          required
          class="w-full"
        />
      </UFormField>
      <UAlert
        v-if="hasError"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="$t('auth.reset.error')"
      />
      <UButton type="submit" block size="lg" :loading="isSubmitting">
        {{ $t('auth.reset.submit') }}
      </UButton>
    </form>
  </main>
</template>
