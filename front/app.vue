<script setup lang="ts">
import { en, fr } from '@nuxt/ui/locale';

const { locale, localeProperties, t } = useNuxtApp().$i18n;
// Localize Nuxt UI's own strings ("No data", search placeholders, …) to match
// the app language — they are separate from the @nuxtjs/i18n messages.
const uiLocale = computed(() => (locale.value === 'fr' ? fr : en));

// Canonical, hreflang alternates, og:url and og:locale come from i18n. Social and search crawlers
// read them from the server-rendered HTML, so they are only computed there: the client keeps the
// tags it was served and skips about 20 reactive head entries (and their i18n lookups) at startup.
// Only `lang`, the title and the description stay reactive, they change on a client-side navigation.
useHead({ htmlAttrs: { lang: (): string => localeProperties.value.language ?? locale.value } });

if (import.meta.server) {
  const head = useLocaleHead({ seo: true });
  type LocaleHead = (typeof head)['value'];
  useHead({
    link: (): NonNullable<LocaleHead['link']> => head.value.link ?? [],
    meta: (): NonNullable<LocaleHead['meta']> => head.value.meta ?? [],
  });

  // Complete Open Graph / Twitter defaults (image, localised alt), pages may override them. og:url
  // and og:locale are already set above by i18n, so they are intentionally not repeated here.
  const ogImage = `${useRuntimeConfig().public.siteUrl}/og-image.png`;
  useSeoMeta({
    ogSiteName: 'verdure',
    ogType: 'website',
    ogTitle: (): string => t('seo.title'),
    ogDescription: (): string => t('seo.description'),
    ogImage,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/png',
    ogImageAlt: (): string => t('seo.imageAlt'),
    twitterCard: 'summary_large_image',
    twitterTitle: (): string => t('seo.title'),
    twitterDescription: (): string => t('seo.description'),
    twitterImage: ogImage,
    twitterImageAlt: (): string => t('seo.imageAlt'),
  });
}

useSeoMeta({
  title: (): string => t('seo.title'),
  description: (): string => t('seo.description'),
});

// A dialog is mounted the first time it is opened, then kept: none of their code runs at startup.
const seenOpen = (source: Ref<boolean>): Ref<boolean> => {
  const seen = ref(source.value);
  watch(source, (open): void => {
    if (open) seen.value = true;
  });
  return seen;
};
// The floating buttons mount in an idle period of their own, so they never stretch hydration.
// The animated foliage is only decoration and its first raster is a long task: it mounts on
// the first interaction (or after 15 s), never while the page is still settling.
const buttonsMounted = ref(false);
const foliageMounted = ref(false);
const whenIdle = (callback: () => void): void => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(callback, { timeout: 1000 });
    return;
  }
  setTimeout(callback, 200);
};
onMounted((): void => {
  whenIdle((): void => {
    buttonsMounted.value = true;
  });
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
  const mountFoliage = (): void => {
    foliageMounted.value = true;
    clearTimeout(fallback);
    for (const name of events) window.removeEventListener(name, mountFoliage);
  };
  const fallback = setTimeout(mountFoliage, 15_000);
  for (const name of events) window.addEventListener(name, mountFoliage, { passive: true });
});
const bugReportMounted = seenOpen(useBugReport().isOpen);
const improvementMounted = seenOpen(useImprovement().isOpen);
const plantnetKeyMounted = seenOpen(usePlantnetKey().isOpen);
const remindersMounted = seenOpen(useReminders().isOpen);
const calendarFeedMounted = seenOpen(useCalendarFeed().isOpen);
</script>

<template>
  <UApp :locale="uiLocale">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Decoration and dialogs are not part of the first paint: they load after hydration, so their
         code is neither in the first HTML nor among the scripts the page preloads. -->
    <LazySiteAmbientFoliage v-if="foliageMounted" />
    <template v-if="buttonsMounted">
      <LazyBugReportButton />
      <LazyImprovementRequestButton />
    </template>
    <LazyBugReportDialog v-if="bugReportMounted" />
    <LazyImprovementRequestDialog v-if="improvementMounted" />
    <LazyAiPlantnetKeyDialog v-if="plantnetKeyMounted" />
    <LazyRemindersDialog v-if="remindersMounted" />
    <LazyCalendarFeedDialog v-if="calendarFeedMounted" />
  </UApp>
</template>
