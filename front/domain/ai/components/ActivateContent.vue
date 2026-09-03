<script setup lang="ts">
const { anyOnline, tokens, revokingId, revoke } = useWorkerTokens();
</script>

<template>
  <UiAnimationReveal variant="up">
    <header class="mb-8">
      <h1 class="text-highlighted text-4xl font-bold tracking-tight sm:text-5xl">
        {{ $t('ai.activate.title') }}
      </h1>
      <p class="text-muted mt-3 text-lg">{{ $t('ai.activate.subtitle') }}</p>
    </header>
  </UiAnimationReveal>

  <UiAnimationReveal variant="up">
    <AiCapabilities />
  </UiAnimationReveal>

  <section class="border-default/70 bg-elevated/30 mb-14 rounded-3xl border p-6 shadow-sm sm:p-8">
    <div
      class="border-default/70 bg-default mb-6 inline-flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-3 text-sm"
    >
      <span
        class="inline-flex size-2.5 shrink-0 rounded-full"
        :class="anyOnline ? 'bg-primary' : 'bg-muted'"
        aria-hidden="true"
      />
      <span class="text-highlighted font-medium">
        {{ anyOnline ? $t('ai.activate.statusConnected') : $t('ai.activate.statusDisconnected') }}
      </span>
    </div>

    <AiInstallPanel />

    <hr class="border-default/60 my-6" />

    <AiWorkerTokens :tokens="tokens" :revoking-id="revokingId" @revoke="revoke" />
  </section>

  <AiHowItWorks class="mb-8" />

  <AiPerks />
</template>
