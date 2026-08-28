<script setup lang="ts">
const { isOpen, state, close, save, clear } = usePlantnetKey();
const { user } = useAuth();

const apiKey = ref('');
const hasKey = computed((): boolean => user.value?.hasPlantnetKey ?? false);

const submit = async (): Promise<void> => {
  if (apiKey.value.trim() === '') {
    return;
  }
  await save(apiKey.value);
  if (state.value === 'saved') {
    apiKey.value = '';
  }
};
</script>

<template>
  <UModal v-model:open="isOpen" :title="$t('ai.plantnetKey.title')">
    <template #body>
      <div class="flex flex-col gap-4">
        <p class="text-muted text-sm">{{ $t('ai.plantnetKey.lead') }}</p>

        <!-- When a key is already set: confirm it, and offer to remove it (which
             falls back to the shared key). The key value is never shown back. -->
        <div
          v-if="hasKey"
          class="border-default flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <UIcon name="i-lucide-circle-check" class="text-primary size-4 shrink-0" aria-hidden="true" />
          <span class="flex-1">{{ $t('ai.plantnetKey.configured') }}</span>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            :loading="state === 'saving'"
            @click="clear"
          >
            {{ $t('ai.plantnetKey.remove') }}
          </UButton>
        </div>

        <form class="flex flex-col gap-3" @submit.prevent="submit">
          <UFormField :label="$t('ai.plantnetKey.label')">
            <UInput
              v-model="apiKey"
              type="password"
              autocomplete="off"
              :placeholder="$t('ai.plantnetKey.placeholder')"
              class="w-full"
            />
          </UFormField>

          <p class="text-dimmed text-xs">
            {{ $t('ai.plantnetKey.help') }}
            <a
              href="https://my.plantnet.org"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary inline-flex items-center gap-0.5 hover:underline"
            >
              {{ $t('ai.plantnetKey.site') }}
              <UIcon name="i-lucide-external-link" class="size-3" aria-hidden="true" />
              <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
            </a>
          </p>

          <p v-if="state === 'saved'" class="text-primary text-sm">
            {{ $t('ai.plantnetKey.saved') }}
          </p>
          <p v-if="state === 'failed'" class="text-error text-sm">
            {{ $t('ai.plantnetKey.failed') }}
          </p>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" type="button" @click="close">
              {{ $t('ai.plantnetKey.close') }}
            </UButton>
            <UButton
              type="submit"
              :disabled="apiKey.trim() === ''"
              :loading="state === 'saving'"
            >
              {{ $t('ai.plantnetKey.save') }}
            </UButton>
          </div>
        </form>
      </div>
    </template>
  </UModal>
</template>
