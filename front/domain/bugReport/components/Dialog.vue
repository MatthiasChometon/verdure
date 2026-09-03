<script setup lang="ts">
import { BugSeverity } from '#gql/default';

const { isOpen, close } = useBugReport();
const { t } = useNuxtApp().$i18n;
const { contextNow } = useReportContext();

// Ten characters is the back's own floor. Enforced here too so the button says
// "not yet" before the server does — being refused after pressing send is the
// moment people give up on reporting anything.
const MIN_LENGTH = 10;

const message = ref('');
const severity = ref<BugSeverity>(BugSeverity.ANNOYING);

// An optional screenshot. A picture of the glitch is often worth more than the
// paragraph describing it, so it is offered — never required.
const screenshot = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
let objectUrl: string | null = null;

const clearPreview = (): void => {
  if (objectUrl !== null) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  previewUrl.value = null;
};

const fileInput = ref<HTMLInputElement | null>(null);

const pickScreenshot = (): void => {
  const selected = fileInput.value?.files?.[0] ?? null;
  clearPreview();
  screenshot.value = selected;
  if (selected !== null) {
    objectUrl = URL.createObjectURL(selected);
    previewUrl.value = objectUrl;
  }
};

const removeScreenshot = (): void => {
  clearPreview();
  screenshot.value = null;
};

onBeforeUnmount(clearPreview);

const severities = computed((): { value: BugSeverity; label: string; icon: string }[] => [
  { value: BugSeverity.BLOCKING, label: t('bugReport.blocking'), icon: 'i-lucide-octagon-x' },
  { value: BugSeverity.ANNOYING, label: t('bugReport.annoying'), icon: 'i-lucide-triangle-alert' },
  { value: BugSeverity.COSMETIC, label: t('bugReport.cosmetic'), icon: 'i-lucide-brush' },
]);

const isTooShort = computed((): boolean => message.value.trim().length < MIN_LENGTH);

const { upload: uploadScreenshot } = useImageUpload(
  '/uploads/bug-image',
  'screenshot',
  'bug-image-upload',
);

// The upload happens inside the mutation, not before it, so its failure lands in
// the same error state as the send — one path, and the form is never cleared on it.
const {
  status,
  error,
  execute: runSend,
  clear,
} = useMutation(async () => {
  const imageKey = screenshot.value === null ? null : await uploadScreenshot(screenshot.value);
  await GqlReportBug({
    input: {
      severity: severity.value,
      message: message.value.trim(),
      context: contextNow(),
      imageKey,
    },
  });
});

const submit = async (): Promise<void> => {
  if (isTooShort.value) {
    return;
  }
  await runSend();
  // The words — and the screenshot — stay put if it failed: a failed send must
  // never cost somebody the paragraph or the picture they just attached.
  if (!error.value) {
    message.value = '';
    removeScreenshot();
  }
};

// A fresh form each time it opens — never the previous thank-you or error screen,
// nor a screenshot left over from a report already sent.
watch(isOpen, (open): void => {
  if (open) {
    clear();
    removeScreenshot();
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

        <UFormField :label="$t('bugReport.screenshot')" :hint="$t('bugReport.optional')">
          <div class="flex flex-wrap items-center gap-3">
            <label
              class="border-default text-muted hover:border-primary hover:text-primary flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-sm transition-colors"
            >
              <UIcon name="i-lucide-image-up" class="size-4" aria-hidden="true" />
              {{
                screenshot === null
                  ? $t('bugReport.pickScreenshot')
                  : $t('bugReport.changeScreenshot')
              }}
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="sr-only"
                @change="pickScreenshot"
              />
            </label>
            <div v-if="previewUrl !== null" class="flex items-center gap-2">
              <img :src="previewUrl" alt="" class="size-12 rounded-lg object-cover" />
              <UButton
                type="button"
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-lucide-x"
                :aria-label="$t('bugReport.removeScreenshot')"
                @click="removeScreenshot"
              />
            </div>
          </div>
        </UFormField>

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
