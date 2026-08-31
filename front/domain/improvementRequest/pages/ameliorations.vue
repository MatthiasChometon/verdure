<script setup lang="ts">
import { ImprovementStatus } from '#gql/default';

const { t, locale } = useNuxtApp().$i18n;
const { isAdmin } = useAdmin();
const isAuthDialogOpen = ref(false);

useSeoMeta({ title: (): string => t('improvement.admin.title') });
useHead({ meta: [{ name: 'robots', content: 'noindex' }] });

const { requests, hasError, setStatus } = useImprovementRequestsAdmin();

const importanceLabel = (importance: string): string =>
  ({
    NICE_TO_HAVE: t('improvement.niceToHave'),
    WOULD_HELP: t('improvement.wouldHelp'),
    IMPORTANT: t('improvement.important'),
  })[importance] ?? importance;

const statusLabel = (status: string): string =>
  ({
    NEW: t('improvement.admin.statusNew'),
    PLANNED: t('improvement.admin.statusPlanned'),
    DONE: t('improvement.admin.statusDone'),
    DECLINED: t('improvement.admin.statusDeclined'),
  })[status] ?? status;

const importanceColour = (importance: string): 'primary' | 'info' | 'neutral' =>
  importance === 'IMPORTANT' ? 'primary' : importance === 'WOULD_HELP' ? 'info' : 'neutral';

const statusColour = (status: string): 'primary' | 'success' | 'neutral' =>
  status === 'PLANNED' ? 'primary' : status === 'DONE' ? 'success' : 'neutral';

const dateLabel = (iso: string): string =>
  new Date(iso).toLocaleString(locale.value, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a href="#content" class="skip-link">{{ $t('accessibility.skip') }}</a>
    <PlantLayoutHeader v-model:open="isAuthDialogOpen" />
    <main id="content" class="mx-auto w-full max-w-5xl flex-1 px-6 pt-28 pb-10">
      <h1 class="text-3xl font-black">{{ $t('improvement.admin.title') }}</h1>
      <p class="text-muted mt-1">{{ $t('improvement.admin.lead') }}</p>

      <ClientOnly>
        <p v-if="!isAdmin" class="text-muted mt-8">{{ $t('improvement.admin.forbidden') }}</p>
        <p v-else-if="hasError" class="text-error mt-8">{{ $t('improvement.admin.failed') }}</p>
        <p v-else-if="requests.length === 0" class="text-muted mt-8">
          {{ $t('improvement.admin.empty') }}
        </p>

      <ul v-else class="mt-6 space-y-3">
        <li v-for="request in requests" :key="request.id">
          <UCard
            :ui="{ body: 'space-y-3' }"
            :class="(request.status === 'DONE' || request.status === 'DECLINED') && 'opacity-60'"
          >
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="importanceColour(request.importance)" variant="subtle" size="sm">
                {{ importanceLabel(request.importance) }}
              </UBadge>
              <UBadge v-if="request.status !== 'NEW'" :color="statusColour(request.status)" variant="subtle" size="sm">
                {{ statusLabel(request.status) }}
              </UBadge>
              <span class="text-muted ml-auto text-xs tabular-nums">
                {{ dateLabel(request.createdAt) }}
              </span>
            </div>

            <p class="whitespace-pre-wrap">{{ request.message }}</p>

            <dl class="text-muted grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
              <div class="flex gap-2">
                <dt class="font-medium">{{ $t('improvement.admin.page') }}</dt>
                <dd class="truncate">{{ request.context.page }}</dd>
              </div>
              <div v-if="request.requestedBy !== null" class="flex gap-2">
                <dt class="font-medium">{{ $t('improvement.admin.requester') }}</dt>
                <dd class="truncate">{{ request.requestedBy }}</dd>
              </div>
            </dl>

            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="request.status !== 'PLANNED'"
                icon="i-lucide-calendar-check"
                size="xs"
                variant="soft"
                @click="setStatus(request.id, ImprovementStatus.PLANNED)"
              >
                {{ $t('improvement.admin.markPlanned') }}
              </UButton>
              <UButton
                v-if="request.status !== 'DONE'"
                icon="i-lucide-check"
                size="xs"
                variant="soft"
                color="success"
                @click="setStatus(request.id, ImprovementStatus.DONE)"
              >
                {{ $t('improvement.admin.markDone') }}
              </UButton>
              <UButton
                v-if="request.status !== 'DECLINED'"
                icon="i-lucide-archive"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="setStatus(request.id, ImprovementStatus.DECLINED)"
              >
                {{ $t('improvement.admin.decline') }}
              </UButton>
              <UButton
                v-if="request.status !== 'NEW'"
                icon="i-lucide-undo-2"
                size="xs"
                variant="ghost"
                color="neutral"
                class="ml-auto"
                @click="setStatus(request.id, ImprovementStatus.NEW)"
              >
                {{ $t('improvement.admin.reopen') }}
              </UButton>
            </div>
          </UCard>
        </li>
      </ul>
    </ClientOnly>
    </main>
    <PlantLayoutFooter />
  </div>
</template>
