<script setup lang="ts">
const { namespace } = defineProps<{ namespace: 'notice' | 'privacy' | 'terms' }>();

const { t, tm, rt } = useNuxtApp().$i18n;

type Section = { title: string; body: string[] };

// tm() returns plain strings or compiled nodes depending on the message; reading both
// avoids breaking the day a comma makes vue-i18n compile a line.
const asText = (value: unknown): string =>
  typeof value === 'string' ? value : rt(value as Parameters<typeof rt>[0]);

// Read the whole legal namespace with a STATIC key, then pick this document's sections
// in JS — never build the i18n key from `namespace` to reach a non-text (array) value.
const sections = computed((): Section[] => {
  const documents = tm('legal') as Record<string, { sections?: unknown[] }>;
  const raw = documents[namespace]?.sections ?? [];
  return raw.map((item): Section => {
    const entry = item as { title: unknown; body: unknown[] };
    return { title: asText(entry.title), body: entry.body.map(asText) };
  });
});

const title = computed((): string => t(`legal.${namespace}.title`));
const contact = computed((): string => String(useRuntimeConfig().public.legalContact));

useSeoMeta({ title: (): string => title.value });
</script>

<template>
  <UContainer class="py-8">
    <!-- A measure, not the page width: these are paragraphs to be read, and a
         line running the width of a laptop is a line the eye loses. -->
    <article class="mx-auto max-w-2xl">
      <header class="mb-8">
        <h1 class="text-3xl font-black sm:text-4xl">{{ title }}</h1>
        <p class="text-muted mt-2 text-lg">{{ $t(`legal.${namespace}.lead`) }}</p>
        <p class="text-dimmed mt-4 text-sm">{{ $t('legal.updated') }}</p>
      </header>

      <div class="space-y-8">
        <section v-for="section in sections" :key="section.title">
          <h2 class="text-xl font-bold">{{ section.title }}</h2>
          <div class="mt-2 space-y-3">
            <p v-for="(paragraph, index) in section.body" :key="index" class="leading-relaxed">
              {{ paragraph }}
            </p>
          </div>
        </section>
      </div>

      <footer class="border-default mt-10 border-t pt-6">
        <p class="text-muted text-sm">
          {{ $t('legal.contactLabel') }}
          <ULink :to="`mailto:${contact}`" class="text-primary font-medium">{{ contact }}</ULink>
        </p>
      </footer>
    </article>
  </UContainer>
</template>
