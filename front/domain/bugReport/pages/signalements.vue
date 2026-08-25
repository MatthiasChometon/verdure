<script setup lang="ts">
import type { BugReportsQuery } from '#gql';
import { BugStatus } from '#gql/default';

type Report = BugReportsQuery['bugReports'][number];

const { t, locale } = useNuxtApp().$i18n;
const { isAdmin } = useAdmin();
// Drives PlantHeader's sign-in dialog, like every other page's chrome.
const isAuthDialogOpen = ref(false);

useSeoMeta({ title: (): string => t('bugReport.admin.title') });
// Nothing here belongs in a search result, and the page needs a session to say
// anything at all.
useHead({ meta: [{ name: 'robots', content: 'noindex' }] });

// No try/catch inside the handler: useAsyncData already captures a failed query
// into `error`, and `default` keeps `data` a list either way — swallowing the
// error here would only hide a failure behind an empty screen.
const { data, error, refresh } = useAsyncData(
  'bug:reports',
  async (): Promise<Report[]> => {
    if (!isAdmin.value) return [];

    const result = await GqlBugReports();
    return result.bugReports;
  },
  { server: false, watch: [isAdmin], default: (): Report[] => [] },
);

const reports = computed((): Report[] => data.value ?? []);

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

const setStatus = async (id: string, status: BugStatus): Promise<void> => {
  await GqlSetBugStatus({ input: { id, status } });
  await refresh();
};

// Acted on from the report you are reading, because that is where a flood shows
// itself. Reversible on the spot: a judgement nobody dares undo is a judgement
// nobody dares make.
const setBlocked = async (reportId: string, blocked: boolean): Promise<void> => {
  await GqlBlockReporter({ input: { reportId, blocked } });
  await refresh();
};
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a href="#content" class="skip-link">{{ $t('accessibility.skip') }}</a>
    <PlantHeader v-model:open="isAuthDialogOpen" />
    <main id="content" class="mx-auto w-full max-w-5xl flex-1 px-6 pt-28 pb-10">
      <h1 class="text-3xl font-black">{{ $t('bugReport.admin.title') }}</h1>
      <p class="text-muted mt-1">{{ $t('bugReport.admin.lead') }}</p>

      <ClientOnly>
        <p v-if="!isAdmin" class="text-muted mt-8">{{ $t('bugReport.admin.forbidden') }}</p>
        <p v-else-if="error" class="text-error mt-8">{{ $t('bugReport.admin.failed') }}</p>
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
    <PlantFooter />
  </div>
</template>
