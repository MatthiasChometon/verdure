<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true });
const { loginWithGoogle } = useAuth();

const {
  view,
  email,
  password,
  name,
  info,
  isSubmitting,
  isResending,
  notVerified,
  title,
  submitLabel,
  errorMessage,
  submit,
  resend,
  setView,
  reset,
} = useAuthForm(() => {
  open.value = false;
});

watch(open, (isOpen): void => {
  if (!isOpen) {
    reset();
  }
});
</script>

<template>
  <UModal v-model:open="open" :title="title">
    <template #body>
      <div v-if="info" class="flex flex-col items-center gap-4 py-4 text-center">
        <UIcon name="i-lucide-mail-check" class="text-primary size-12" aria-hidden="true" />
        <p class="text-muted text-sm">{{ info }}</p>
        <UButton block color="neutral" variant="subtle" @click="open = false">
          {{ $t('auth.dialog.gotIt') }}
        </UButton>
      </div>

      <template v-else>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <UFormField v-if="view === 'register'" :label="$t('auth.dialog.name')" required>
            <UInput v-model="name" autocomplete="name" enterkeyhint="next" required class="w-full" />
          </UFormField>

          <UFormField :label="$t('auth.dialog.email')" required>
            <UInput
              v-model="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              :enterkeyhint="view === 'forgot' ? 'go' : 'next'"
              required
              class="w-full"
            />
          </UFormField>

          <p v-if="view === 'forgot'" class="text-muted text-sm">
            {{ $t('auth.dialog.forgotHint') }}
          </p>

          <UFormField
            v-if="view !== 'forgot'"
            :label="$t('auth.dialog.password')"
            :hint="view === 'register' ? $t('auth.dialog.passwordHint') : undefined"
            required
          >
            <UInput
              v-model="password"
              type="password"
              :autocomplete="view === 'register' ? 'new-password' : 'current-password'"
              :minlength="view === 'register' ? 8 : undefined"
              enterkeyhint="go"
              required
              class="w-full"
            />
          </UFormField>

          <div v-if="view === 'login'" class="-mt-2 text-right">
            <UButton variant="link" size="xs" class="p-0" @click="setView('forgot')">
              {{ $t('auth.dialog.forgotLink') }}
            </UButton>
          </div>

          <UAlert
            v-if="notVerified"
            color="warning"
            variant="soft"
            icon="i-lucide-mail-warning"
            :title="$t('auth.dialog.notVerified')"
          >
            <template #description>
              <UButton
                variant="link"
                size="xs"
                class="p-0"
                :loading="isResending"
                @click="resend"
              >
                {{ $t('auth.dialog.resend') }}
              </UButton>
            </template>
          </UAlert>

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :title="errorMessage"
          />

          <UButton type="submit" block size="lg" :loading="isSubmitting">
            {{ submitLabel }}
          </UButton>
        </form>

        <template v-if="view !== 'forgot'">
          <div class="text-dimmed my-5 flex items-center gap-3 text-sm">
            <span class="bg-border h-px flex-1" />
            {{ $t('auth.dialog.or') }}
            <span class="bg-border h-px flex-1" />
          </div>

          <UButton
            block
            size="lg"
            color="neutral"
            variant="subtle"
            icon="i-lucide-log-in"
            @click="loginWithGoogle"
          >
            {{ $t('auth.google') }}
          </UButton>

          <UButton
            block
            variant="link"
            class="mt-3"
            @click="setView(view === 'login' ? 'register' : 'login')"
          >
            {{ view === 'login' ? $t('auth.dialog.toRegister') : $t('auth.dialog.toLogin') }}
          </UButton>
        </template>

        <UButton v-else block variant="link" class="mt-3" @click="setView('login')">
          {{ $t('auth.dialog.backToLogin') }}
        </UButton>
      </template>
    </template>
  </UModal>
</template>
