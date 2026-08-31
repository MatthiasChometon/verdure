<script setup lang="ts">
const { locale, locales } = useNuxtApp().$i18n;
const switchLocalePath = useSwitchLocalePath();

const localeItems = computed((): SelectItem[] =>
  locales.value.map((candidate): SelectItem => ({
    label: candidate.code.toUpperCase(),
    value: candidate.code,
  })),
);

type LocaleCode = (typeof locales)['value'][number]['code'];

const onLocaleChange = async (code: string): Promise<void> => {
  await navigateTo(switchLocalePath(code as LocaleCode));
};

const open = defineModel<boolean>('open', { required: true });
const { user, isAuthReady } = useAuth();

// Live GPU-worker status: drives the header indicator, and a light toast when it
// flips so the user is told in real time — no page refresh.
const { online: aiOnline } = useWorkerStatusToast();

// The avatar is a menu once there is more than one thing to do with the account.
const { accountItems } = useAccountMenu();
</script>

<template>
  <header
    class="border-default/60 bg-default/70 fixed inset-x-0 top-0 z-40 border-b backdrop-blur-md"
  >
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
      <div class="flex items-center gap-2 sm:gap-5">
        <NuxtLinkLocale
          to="/"
          class="text-highlighted font-display flex items-center gap-2 text-xl font-semibold tracking-tight"
        >
          <UIcon name="i-lucide-sprout" class="text-primary size-6 shrink-0" aria-hidden="true" />
          <span class="hidden sm:inline">
            {{ $t('plant.layout.brand') }}<span class="text-primary">.</span>
          </span>
        </NuxtLinkLocale>
        <nav class="flex items-center gap-1" :aria-label="$t('plant.layout.navLabel')">
          <NuxtLinkLocale
            to="/"
            class="text-muted hover:text-highlighted flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:px-3"
            exact-active-class="!text-primary"
          >
            <UIcon name="i-lucide-leaf" class="size-4 shrink-0" aria-hidden="true" />
            <span class="hidden sm:inline">{{ $t('plant.layout.navPlants') }}</span>
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/calendar"
            class="text-muted hover:text-highlighted flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:px-3"
            active-class="!text-primary"
          >
            <UIcon name="i-lucide-calendar-days" class="size-4 shrink-0" aria-hidden="true" />
            <span class="hidden sm:inline">{{ $t('plant.layout.navCalendar') }}</span>
          </NuxtLinkLocale>
          <NuxtLinkLocale
            to="/activate-ai"
            class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:px-3"
            :class="aiOnline ? 'text-primary' : 'text-muted hover:text-highlighted'"
            active-class="!text-primary"
            :title="aiOnline ? $t('plant.layout.aiConnected') : $t('plant.layout.navAi')"
          >
            <!-- Offline: the sparkles "activate" affordance. Online: a live,
                 pulsing dot — the real-time connection indicator. -->
            <span
              class="flex size-4 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <UIcon v-if="!aiOnline" name="i-lucide-sparkles" class="size-4" />
              <span v-else class="relative flex size-2.5">
                <span
                  class="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full"
                />
                <span class="bg-primary relative inline-flex size-2.5 rounded-full"/>
              </span>
            </span>
            <span class="hidden sm:inline">
              {{ aiOnline ? $t('plant.layout.aiConnected') : $t('plant.layout.navAi') }}
            </span>
          </NuxtLinkLocale>
        </nav>
      </div>

      <div class="flex items-center gap-2">
        <UColorModeButton :aria-label="$t('plant.layout.themeLabel')" />
        <USelect
          :model-value="locale"
          :items="localeItems"
          size="sm"
          color="neutral"
          variant="ghost"
          class="w-16 sm:w-20"
          :aria-label="$t('plant.layout.langLabel')"
          @update:model-value="onLocaleChange"
        />

        <ClientOnly>
          <USkeleton v-if="!isAuthReady" class="size-8 rounded-full" />
          <UDropdownMenu v-else-if="user" :items="accountItems">
            <UButton variant="ghost" color="neutral" size="sm" :aria-label="$t('auth.account')">
              <UAvatar :src="user.avatarUrl ?? undefined" :alt="user.name" size="sm" />
            </UButton>
          </UDropdownMenu>
          <UButton
            v-else
            size="sm"
            color="neutral"
            variant="subtle"
            icon="i-lucide-log-in"
            :aria-label="$t('auth.signIn')"
            @click="open = true"
          >
            <span class="hidden sm:inline">{{ $t('auth.signIn') }}</span>
          </UButton>
          <template #fallback>
            <USkeleton class="size-8 rounded-full" />
          </template>
        </ClientOnly>
      </div>
    </div>
    <AuthDialog v-model:open="open" />
  </header>
</template>
