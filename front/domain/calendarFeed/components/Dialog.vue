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

          <div class="border-default flex flex-col gap-3 rounded-lg border p-3">
            <p class="text-sm font-medium">{{ $t('calendarFeed.google.title') }}</p>
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

          <div class="border-default flex flex-col gap-3 rounded-lg border p-3">
            <p class="text-sm font-medium">{{ $t('calendarFeed.apple.title') }}</p>
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

          <p v-if="regenerateStatus === 'error' || regenerateError" class="text-error text-sm">
            {{ $t('calendarFeed.failed') }}
          </p>
          <p v-else-if="regenerateStatus === 'success'" class="text-primary text-sm">
            {{ $t('calendarFeed.regenerated') }}
          </p>
        </template>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <div v-if="status === 'success'" class="flex flex-col items-start gap-0.5">
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              :loading="regenerateStatus === 'pending'"
              @click="runRegenerate()"
            >
              {{ $t('calendarFeed.regenerate') }}
            </UButton>
            <p class="text-dimmed text-xs">{{ $t('calendarFeed.regenerateHint') }}</p>
          </div>
          <div v-else />
          <UButton variant="ghost" color="neutral" type="button" @click="close">
            {{ $t('calendarFeed.close') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
