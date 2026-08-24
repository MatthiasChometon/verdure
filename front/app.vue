<script setup lang="ts">
import { en, fr } from '@nuxt/ui/locale';

const { locale } = useNuxtApp().$i18n;
// Localize Nuxt UI's own strings ("No data", search placeholders, …) to match
// the app language — they are separate from the @nuxtjs/i18n messages.
const uiLocale = computed(() => (locale.value === 'fr' ? fr : en));

// Canonical, hreflang alternates, og:url and og:locale come from i18n.
const head = useLocaleHead({ seo: true });

type LocaleHead = (typeof head)['value'];

useHead({
  htmlAttrs: { lang: (): string => head.value.htmlAttrs?.lang ?? 'fr' },
  link: (): NonNullable<LocaleHead['link']> => head.value.link ?? [],
  meta: (): NonNullable<LocaleHead['meta']> => head.value.meta ?? [],
});

// Complete Open Graph / Twitter defaults (title, description, image), localised;
// pages may override them. og:url and og:locale are already set above by i18n,
// so they are intentionally not repeated here.
const { t } = useNuxtApp().$i18n;
const ogImage = `${useRuntimeConfig().public.siteUrl}/og-image.png`;

useSeoMeta({
  title: (): string => t('seo.title'),
  description: (): string => t('seo.description'),
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
</script>

<template>
  <UApp :locale="uiLocale">
    <NuxtPage />
    <BugReportButton />
    <BugReportDialog />
    <ImprovementRequestButton />
    <ImprovementRequestDialog />
  </UApp>
</template>
