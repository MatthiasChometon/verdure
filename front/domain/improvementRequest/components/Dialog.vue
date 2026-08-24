<script setup lang="ts">
import { ImprovementImportance } from '#gql/default';

const { isOpen, state, close, send } = useImprovement();
const { t } = useNuxtApp().$i18n;

// Ten characters is the back's own floor. Enforced here too so the button says
// "not yet" before the server does — being refused after pressing send is the
// moment people stop suggesting anything.
const MIN_LENGTH = 10;

const message = ref('');
const importance = ref<ImprovementImportance>(ImprovementImportance.WOULD_HELP);

const levels = computed(
  (): { value: ImprovementImportance; label: string; icon: string }[] => [
    {
      value: ImprovementImportance.NICE_TO_HAVE,
      label: t('improvement.niceToHave'),
      icon: 'i-lucide-sparkles',
    },
    {
      value: ImprovementImportance.WOULD_HELP,
      label: t('improvement.wouldHelp'),
      icon: 'i-lucide-thumbs-up',
    },
    {
      value: ImprovementImportance.IMPORTANT,
      label: t('improvement.important'),
      icon: 'i-lucide-star',
    },
  ],
);

const isTooShort = computed((): boolean => message.value.trim().length < MIN_LENGTH);

const submit = async (): Promise<void> => {
  if (isTooShort.value) return;

  await send(importance.value, message.value.trim());
  if (state.value === 'sent') message.value = '';
};
</script>

<template>
  <UModal v-model:open="isOpen" :title="$t('improvement.title')">
    <template #body>
      <!-- Thanked and told what left with it: an idea sent into silence is the
           last one somebody sends. -->
      <div v-if="state === 'sent'" class="flex flex-col items-center gap-3 py-4 text-center">
        <UIcon name="i-lucide-party-popper" class="text-primary size-10" />
        <p class="text-lg font-bold">{{ $t('improvement.sent') }}</p>
        <p class="text-muted max-w-sm text-sm">{{ $t('improvement.sentLead') }}</p>
        <UButton class="mt-2" @click="close">{{ $t('improvement.close') }}</UButton>
      </div>

      <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
        <p class="text-muted text-sm">{{ $t('improvement.lead') }}</p>

        <UFormField :label="$t('improvement.label')" required>
          <UTextarea
            v-model="message"
            :rows="4"
            autofocus
            :placeholder="$t('improvement.placeholder')"
            class="w-full"
          />
        </UFormField>

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-1 text-sm font-medium">{{ $t('improvement.importance') }}</legend>
          <div class="grid grid-cols-3 gap-2">
            <UButton
              v-for="entry in levels"
              :key="entry.value"
              type="button"
              :icon="entry.icon"
              size="sm"
              block
              :variant="importance === entry.value ? 'soft' : 'outline'"
              :color="importance === entry.value ? 'primary' : 'neutral'"
              :aria-pressed="importance === entry.value"
              @click="importance = entry.value"
            >
              {{ entry.label }}
            </UButton>
          </div>
        </fieldset>

        <p v-if="state === 'failed'" class="text-error text-sm">{{ $t('improvement.failed') }}</p>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" type="button" @click="close">
            {{ $t('improvement.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :disabled="isTooShort"
            :loading="state === 'sending'"
            :title="isTooShort ? $t('improvement.tooShort') : undefined"
          >
            {{ $t('improvement.send') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
