<script setup lang="ts">
const { isOpen, close } = useCalendarFeed();

const { data, refresh, status } = useQuery('calendar-feed-token', () => GqlCalendarFeedToken());
const token = computed((): string | undefined => data.value?.calendarFeedToken ?? undefined);

const feedUrl = computed((): string | undefined => {
  if (token.value === undefined) {
    return undefined;
  }
  return `${useRuntimeConfig().public.apiBase}/calendar-feed/${encodeURIComponent(token.value)}`;
});
// webcal:// is what makes iOS/macOS open the native "Subscribe to Calendar"
// sheet directly, instead of just downloading the URL's contents.
const webcalUrl = computed((): string | undefined =>
  feedUrl.value?.replace(/^https?:\/\//, 'webcal://'),
);
// Google's own "Add this calendar?" prompt, one click, no copy-paste — also
// what Android picks up since it shares the same Google account.
const googleAddByUrl = computed((): string | undefined =>
  webcalUrl.value === undefined
    ? undefined
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

// The text of the one persistent live region: empty until a regeneration succeeds.
const { t } = useNuxtApp().$i18n;
const regeneratedMessage = computed((): string =>
  regenerateStatus.value === 'success' ? t('calendarFeed.regenerated') : '',
);

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

        <!-- No RRULE (watering intervals shift with the season): each event
             only ever shows the next due date, refreshed in place whenever
             the subscribing app resyncs its feed. -->
        <UAlert
          color="neutral"
          variant="soft"
          icon="i-lucide-info"
          :title="$t('calendarFeed.oneAtATime.title')"
          :description="$t('calendarFeed.oneAtATime.description')"
        />

        <template v-if="status === 'pending' || status === 'idle'">
          <div class="flex items-center gap-3" aria-hidden="true">
            <USkeleton class="h-9 flex-1" />
            <USkeleton class="h-9 w-20" />
          </div>
          <span class="sr-only" role="status">{{ $t('calendarFeed.loading') }}</span>
        </template>

        <p
          v-else-if="status === 'error' || feedUrl === undefined"
          class="text-error text-sm"
          role="alert"
        >
          {{ $t('calendarFeed.failed') }}
        </p>

        <template v-else>
          <CalendarFeedProvider
            v-if="googleAddByUrl !== undefined && (deviceTarget === 'google' || showOtherOptions)"
            :title="$t('calendarFeed.google.title')"
            :lead="$t('calendarFeed.google.lead')"
            :open-label="$t('calendarFeed.google.open')"
            :to="googleAddByUrl"
            external
          />

          <CalendarFeedProvider
            v-if="webcalUrl !== undefined && (deviceTarget === 'apple' || showOtherOptions)"
            :title="$t('calendarFeed.apple.title')"
            :lead="$t('calendarFeed.apple.lead')"
            :open-label="$t('calendarFeed.apple.open')"
            :to="webcalUrl"
          />

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

          <p
            v-if="regenerateStatus === 'error' || regenerateError"
            class="text-error text-sm"
            role="alert"
          >
            {{ $t('calendarFeed.failed') }}
          </p>
          <!-- One persistent live region: its text changes, the region does not. -->
          <p class="text-primary text-sm" role="status">
            {{ regeneratedMessage }}
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
