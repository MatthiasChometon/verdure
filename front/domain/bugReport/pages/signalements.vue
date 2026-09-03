<script setup lang="ts">
import { BugStatus } from '#gql/default';

defineI18nRoute({ paths: { fr: '/signalements', en: '/reports' } });

const { t, locale } = useNuxtApp().$i18n;
const { isAdmin } = useAdmin();

useSeoMeta({ title: (): string => t('bugReport.admin.title') });
// Nothing here belongs in a search result, and the page needs a session to say
// anything at all.
useHead({ meta: [{ name: 'robots', content: 'noindex' }] });

const { reports, hasError, setStatus, setBlocked } = useBugReportsAdmin();

const severityLabel = (severity: string): string =>
  ({
    BLOCKING: t('bugReport.blocking'),
    ANNOYING: t('bugReport.annoying'),
    COSMETIC: t('bugReport.cosmetic'),
  })[severity] ?? severity;

const statusLabel = (status: string): string =>
  ({
    NEW: t('bugReport.admin.statusNew'),
    FIXED: t('bugReport.admin.statusFixed'),
    DISMISSED: t('bugReport.admin.statusDismissed'),
  })[status] ?? status;

const severityColour = (severity: string): 'error' | 'warning' | 'neutral' =>
  severity === 'BLOCKING' ? 'error' : severity === 'ANNOYING' ? 'warning' : 'neutral';

const dateLabel = (iso: string): string =>
  new Date(iso).toLocaleString(locale.value, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
</script>

<template>
  <main id="content" class="mx-auto w-full max-w-5xl flex-1 px-6 pt-28 pb-10">
    <h1 class="text-3xl font-black">{{ $t('bugReport.admin.title') }}</h1>
    <p class="text-muted mt-1">{{ $t('bugReport.admin.lead') }}</p>

    <ClientOnly>
      <p v-if="!isAdmin" class="text-muted mt-8">{{ $t('bugReport.admin.forbidden') }}</p>
      <p v-else-if="hasError" class="text-error mt-8">{{ $t('bugReport.admin.failed') }}</p>
      <p v-else-if="reports.length === 0" class="text-muted mt-8">
        {{ $t('bugReport.admin.empty') }}
      </p>

      <ul v-else class="mt-6 space-y-3">
        <li v-for="report in reports" :key="report.id">
          <UCard :ui="{ body: 'space-y-3' }" :class="report.status !== 'NEW' && 'opacity-60'">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="severityColour(report.severity)" variant="subtle" size="sm">
                {{ severityLabel(report.severity) }}
              </UBadge>
              <UBadge v-if="report.status !== 'NEW'" color="neutral" variant="subtle" size="sm">
                {{ statusLabel(report.status) }}
              </UBadge>
              <UBadge v-if="report.reporterBlocked" color="error" variant="subtle" size="sm">
                {{ $t('bugReport.admin.blocked') }}
              </UBadge>
              <span class="text-muted ml-auto text-xs tabular-nums">
                {{ dateLabel(report.createdAt) }}
              </span>
            </div>

            <p class="whitespace-pre-wrap">{{ report.message }}</p>

            <a
              v-if="report.imageUrl"
              :href="report.imageUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="border-default hover:border-primary inline-block overflow-hidden rounded-lg border transition-colors"
            >
              <img
                :src="report.imageUrl"
                :alt="$t('bugReport.admin.screenshot')"
                class="max-h-64 w-auto object-contain"
              />
              <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
            </a>

            <dl class="text-muted grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
              <div class="flex gap-2">
                <dt class="font-medium">{{ $t('bugReport.admin.page') }}</dt>
                <dd class="truncate">{{ report.context.page }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="font-medium">{{ $t('bugReport.admin.screen') }}</dt>
                <dd>{{ report.context.viewport }}</dd>
              </div>
              <div v-if="report.reportedBy !== null" class="flex gap-2">
                <dt class="font-medium">{{ $t('bugReport.admin.reporter') }}</dt>
                <dd class="truncate">{{ report.reportedBy }}</dd>
              </div>
              <div class="flex gap-2 sm:col-span-2">
                <dt class="font-medium">{{ $t('bugReport.admin.browser') }}</dt>
                <dd class="truncate">{{ report.context.userAgent }}</dd>
              </div>
            </dl>

            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="report.status === 'NEW'"
                icon="i-lucide-check"
                size="xs"
                variant="soft"
                @click="setStatus(report.id, BugStatus.FIXED)"
              >
                {{ $t('bugReport.admin.markFixed') }}
              </UButton>
              <UButton
                v-if="report.status === 'NEW'"
                icon="i-lucide-archive"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="setStatus(report.id, BugStatus.DISMISSED)"
              >
                {{ $t('bugReport.admin.dismiss') }}
              </UButton>
              <UButton
                v-else
                icon="i-lucide-undo-2"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="setStatus(report.id, BugStatus.NEW)"
              >
                {{ $t('bugReport.admin.reopen') }}
              </UButton>

              <UButton
                v-if="report.reportedBy !== null"
                :icon="report.reporterBlocked ? 'i-lucide-user-check' : 'i-lucide-user-x'"
                size="xs"
                variant="ghost"
                :color="report.reporterBlocked ? 'neutral' : 'error'"
                class="ml-auto"
                :title="report.reporterBlocked ? undefined : $t('bugReport.admin.blockedNote')"
                @click="setBlocked(report.id, !report.reporterBlocked)"
              >
                {{
                  report.reporterBlocked
                    ? $t('bugReport.admin.unblock')
                    : $t('bugReport.admin.block')
                }}
              </UButton>
            </div>
          </UCard>
        </li>
      </ul>
    </ClientOnly>
  </main>
</template>
