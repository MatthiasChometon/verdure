<script setup lang="ts">
import { BugSeverity } from '#gql/default';

const { isOpen, close } = useBugReport();
const { t, locale } = useNuxtApp().$i18n;
const route = useRoute();

// Ten characters is the back's own floor. Enforced here too so the button says
// "not yet" before the server does — being refused after pressing send is the
// moment people give up on reporting anything.
const MIN_LENGTH = 10;

const message = ref('');
const severity = ref<BugSeverity>(BugSeverity.ANNOYING);

const severities = computed((): { value: BugSeverity; label: string; icon: string }[] => [
  { value: BugSeverity.BLOCKING, label: t('bugReport.blocking'), icon: 'i-lucide-octagon-x' },
  { value: BugSeverity.ANNOYING, label: t('bugReport.annoying'), icon: 'i-lucide-triangle-alert' },
  { value: BugSeverity.COSMETIC, label: t('bugReport.cosmetic'), icon: 'i-lucide-brush' },
]);

const isTooShort = computed((): boolean => message.value.trim().length < MIN_LENGTH);

// Read at the moment of sending, in the browser, because that is the only place
// any of it exists — and the whole point is that nobody has to type it.
const contextNow = (): { page: string; userAgent: string; viewport: string; locale: string } => ({
  page: route.fullPath,
  userAgent: navigator.userAgent,
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  locale: locale.value,
});

const { status, error, execute: runSend, clear } = useMutation(() =>
  GqlReportBug({
    input: { severity: severity.value, message: message.value.trim(), context: contextNow() },
  }),
);

const submit = async (): Promise<void> => {
  if (isTooShort.value) {
    return;
  }
  await runSend();
  // The words stay in the box if it failed: a failed send must never cost
  // somebody the paragraph they just wrote.
  if (!error.value) {
    message.value = '';
  }
};

// A fresh form each time it opens — never the previous thank-you or error screen.
watch(isOpen, (open): void => {
  if (open) {
    clear();
  }
});
</script>

<template>
  <UModal v-model:open="isOpen" :title="$t('bugReport.title')">
    <template #body>
      <!-- Thanked and told what left with it: somebody who reports a bug into
           silence does not report the next one. -->
      <div v-if="status === 'success'" class="flex flex-col items-center gap-3 py-4 text-center">
        <UIcon name="i-lucide-circle-check" class="text-primary size-10" />
        <p class="text-lg font-bold">{{ $t('bugReport.sent') }}</p>
        <p class="text-muted max-w-sm text-sm">{{ $t('bugReport.sentLead') }}</p>
        <UButton class="mt-2" @click="close">{{ $t('bugReport.close') }}</UButton>
      </div>

      <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
        <p class="text-muted text-sm">{{ $t('bugReport.lead') }}</p>

        <UFormField :label="$t('bugReport.label')" required>
          <UTextarea
            v-model="message"
            :rows="4"
            autofocus
            :placeholder="$t('bugReport.placeholder')"
            class="w-full"
          />
        </UFormField>

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-1 text-sm font-medium">{{ $t('bugReport.severity') }}</legend>
          <div class="grid grid-cols-3 gap-2">
            <UButton
              v-for="entry in severities"
              :key="entry.value"
              type="button"
              :icon="entry.icon"
              size="sm"
              block
              :variant="severity === entry.value ? 'soft' : 'outline'"
              :color="severity === entry.value ? 'primary' : 'neutral'"
              :aria-pressed="severity === entry.value"
              @click="severity = entry.value"
            >
              {{ entry.label }}
            </UButton>
          </div>
        </fieldset>

        <p v-if="status === 'error'" class="text-error text-sm">{{ $t('bugReport.failed') }}</p>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" type="button" @click="close">
            {{ $t('bugReport.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :disabled="isTooShort"
            :loading="status === 'pending'"
            :title="isTooShort ? $t('bugReport.tooShort') : undefined"
          >
            {{ $t('bugReport.send') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
