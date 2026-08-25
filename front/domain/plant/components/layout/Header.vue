<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const { locale, locales, t } = useNuxtApp().$i18n;
const switchLocalePath = useSwitchLocalePath();
const localePath = useLocalePath();

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
const { user, status, logout } = useAuth();
// Hold the skeleton until the `me` query settles, so the sign-in button never
// flashes before a logged-in user's avatar appears.
const isAuthReady = computed(
  (): boolean => status.value === 'success' || status.value === 'error',
);

// The avatar is a menu once there is more than one thing to do with the account.
// The admin screens live here — the calm way in — and simply do not exist in the
// menu for anyone who is not an administrator, rather than being rendered hidden.
const { isAdmin } = useAdmin();

const accountItems = computed((): DropdownMenuItem[][] => [
  [{ label: user.value?.name ?? user.value?.email ?? '', type: 'label' as const }],
  ...(isAdmin.value
    ? [
        [
          {
            label: t('bugReport.admin.title'),
            icon: 'i-lucide-list-checks',
            to: localePath('/signalements'),
          },
          {
            label: t('improvement.admin.title'),
            icon: 'i-lucide-lightbulb',
            to: localePath('/ameliorations'),
          },
        ],
      ]
    : []),
  [
    {
      label: t('auth.logout'),
      icon: 'i-lucide-log-out',
      onSelect: (): void => {
        void logout();
      },
    },
  ],
]);
</script>

<template>
  <header
    class="border-default/60 bg-default/70 fixed inset-x-0 top-0 z-40 border-b backdrop-blur-md"
  >
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
      <div class="flex items-center gap-2 sm:gap-5">
        <NuxtLinkLocale
          to="/"
          class="text-highlighted flex items-center gap-2 text-lg font-semibold"
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
            class="text-muted hover:text-highlighted flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:px-3"
            active-class="!text-primary"
          >
            <UIcon name="i-lucide-sparkles" class="size-4 shrink-0" aria-hidden="true" />
            <span class="hidden sm:inline">{{ $t('plant.layout.navAi') }}</span>
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
