<script setup lang="ts">
const { tokens, revokingId } = defineProps<{
  tokens: WorkerToken[];
  revokingId: string | null;
}>();

const emit = defineEmits<{ revoke: [id: string] }>();
</script>

<template>
  <h2 class="text-highlighted mb-3 text-base font-semibold">
    {{ $t('ai.activate.tokensTitle') }}
  </h2>
  <p v-if="tokens.length === 0" class="text-muted text-sm">
    {{ $t('ai.activate.noTokens') }}
  </p>
  <ul v-else class="flex flex-col gap-2">
    <li
      v-for="token in tokens"
      :key="token.id"
      class="border-default bg-default flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
    >
      <div class="flex items-center gap-2">
        <span
          class="inline-flex size-2 shrink-0 rounded-full"
          :class="token.online ? 'bg-primary' : 'bg-muted'"
          aria-hidden="true"
        />
        <span class="text-highlighted text-sm font-medium">
          {{ token.label ?? '—' }}
        </span>
        <span class="text-muted text-xs">
          {{ token.online ? $t('ai.activate.online') : $t('ai.activate.offline') }}
        </span>
      </div>
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-trash-2"
        :aria-label="$t('ai.activate.revoke')"
        :loading="revokingId === token.id"
        @click="emit('revoke', token.id)"
      />
    </li>
  </ul>
</template>
