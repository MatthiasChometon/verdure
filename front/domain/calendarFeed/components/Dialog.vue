<script setup lang="ts">
const { isOpen, close } = useCalendarFeed();

const { data, refresh, status } = useQuery('calendar-feed-token', () => GqlCalendarFeedToken());
const token = computed((): string | null => data.value?.calendarFeedToken ?? null);

const feedUrl = computed((): string | null => {
  if (token.value === null) {
    return null;
  }
  return `${useRuntimeConfig().public.apiBase}/calendar-feed/${token.value}`;
});
// webcal:// is what makes iOS/macOS open the native "Subscribe to Calendar"
// sheet directly, instead of just downloading the URL's contents.
const webcalUrl = computed((): string | null =>
  feedUrl.value === null ? null : feedUrl.value.replace(/^https?:\/\//, 'webcal://'),
);
// Google's own "Add this calendar?" prompt, one click, no copy-paste — also
// what Android picks up since it shares the same Google account.
const googleAddByUrl = computed((): string | null =>
  webcalUrl.value === null
    ? null
    : `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl.value)}`,
);

const { copy, copied } = useClipboard({ source: computed((): string => feedUrl.value ?? '') });

// The dialog's body only mounts once opened by a click, so this always runs
// client-side — no SSR/hydration mismatch to guard against.
const deviceTarget = computed((): 'apple' | 'google' =>
  import.meta.client && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? 'apple' : 'google',
);
// Lets a reader whose device doesn't match their actual calendar account
// (e.g. Google Agenda on an iPhone) reveal the other option.
const showOtherOptions = ref(false);

const {
  status: regenerateStatus,
  execute: runRegenerate,
  error: regenerateError,
} = useMutation(async (): Promise<void> => {
  const result = await GqlRegenerateCalendarFeedToken();
  data.value = { calendarFeedToken: result.regenerateCalendarFeedToken };
});

// A fresh read each time it opens — never a stale or previously-regenerated link.
watch(isOpen, (open): void => {
  if (open) {
    void refresh();
    showOtherOptions.value = false;
  }
});
</script>

<template>
  <UModal v-model:open="isOpen" :title="$t('calendarFeed.title')">
    <template #body>
      <div class="flex flex-col gap-4">
        <p class="text-muted text-sm">{{ $t('calendarFeed.lead') }}</p>

        <template v-if="status === 'pending' || status === 'idle'">
          <div class="flex items-center gap-3" aria-hidden="true">
            <USkeleton class="h-9 flex-1" />
            <USkeleton class="h-9 w-20" />
          </div>
          <span class="sr-only" role="status">{{ $t('calendarFeed.loading') }}</span>
        </template>

        <p v-else-if="status === 'error' || feedUrl === null" class="text-error text-sm">
          {{ $t('calendarFeed.failed') }}
        </p>

        <template v-else>
          <div
            v-if="deviceTarget === 'google' || showOtherOptions"
            class="border-default flex flex-col gap-3 rounded-lg border p-3"
          >
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-calendar-plus"
                class="text-primary size-5 shrink-0"
                aria-hidden="true"
              />
              <p class="text-sm font-medium">{{ $t('calendarFeed.google.title') }}</p>
            </div>
            <p class="text-muted text-sm">{{ $t('calendarFeed.google.lead') }}</p>
            <UButton
              v-if="googleAddByUrl !== null"
              variant="outline"
              color="neutral"
              icon="i-lucide-calendar-plus"
              :to="googleAddByUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="self-start"
            >
              {{ $t('calendarFeed.google.open') }}
              <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
            </UButton>
          </div>

          <div
            v-if="deviceTarget === 'apple' || showOtherOptions"
            class="border-default flex flex-col gap-3 rounded-lg border p-3"
          >
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-calendar-plus"
                class="text-primary size-5 shrink-0"
                aria-hidden="true"
              />
              <p class="text-sm font-medium">{{ $t('calendarFeed.apple.title') }}</p>
            </div>
            <p class="text-muted text-sm">{{ $t('calendarFeed.apple.lead') }}</p>
            <UButton
              v-if="webcalUrl !== null"
              variant="outline"
              color="neutral"
              icon="i-lucide-calendar-plus"
              :to="webcalUrl"
              class="self-start"
            >
              {{ $t('calendarFeed.apple.open') }}
            </UButton>
          </div>

          <UButton
            v-if="!showOtherOptions"
            variant="link"
            size="xs"
            class="self-start p-0"
            @click="showOtherOptions = true"
          >
            {{ $t('calendarFeed.showOther') }}
          </UButton>

          <!-- The least common path (Outlook, etc.): last, and unadorned. -->
          <UFormField :label="$t('calendarFeed.urlLabel')">
            <div class="flex gap-2">
              <UInput :model-value="feedUrl" readonly class="w-full font-mono text-xs" />
              <UButton
                variant="soft"
                color="neutral"
                :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                @click="copy()"
              >
                {{ copied ? $t('calendarFeed.copied') : $t('calendarFeed.copy') }}
              </UButton>
            </div>
          </UFormField>

          <!-- Title + hint on the left, action on the right — never stacked
               under the button's own label. -->
          <div
            v-if="status === 'success'"
            class="border-default/60 flex items-center justify-between gap-3 rounded-xl border p-4"
          >
            <div>
              <p class="text-highlighted text-sm font-medium">
                {{ $t('calendarFeed.regenerate') }}
              </p>
              <p class="text-dimmed text-xs">{{ $t('calendarFeed.regenerateHint') }}</p>
            </div>
            <UButton
              variant="soft"
              color="neutral"
              size="sm"
              icon="i-lucide-refresh-cw"
              :loading="regenerateStatus === 'pending'"
              :aria-label="$t('calendarFeed.regenerate')"
              @click="runRegenerate()"
            />
          </div>

          <p v-if="regenerateStatus === 'error' || regenerateError" class="text-error text-sm">
            {{ $t('calendarFeed.failed') }}
          </p>
          <p v-else-if="regenerateStatus === 'success'" class="text-primary text-sm">
            {{ $t('calendarFeed.regenerated') }}
          </p>
        </template>

        <div class="flex justify-end">
          <UButton variant="ghost" color="neutral" type="button" @click="close">
            {{ $t('calendarFeed.close') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
