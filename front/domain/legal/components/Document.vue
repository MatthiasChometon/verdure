<script setup lang="ts">
const { namespace } = defineProps<{ namespace: 'notice' | 'privacy' | 'terms' }>();

const { t, tm, rt } = useNuxtApp().$i18n;

type Section = { title: string; body: string[] };

type MessageNode = Parameters<typeof rt>[0];

// typeof is "object" for the JS null too: the second test is the guard, not a domain null.
const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

const isRecord = (value: unknown): value is Record<string, unknown> => isObject(value);

// A compiled message is an object; vue-i18n types it as its own node type.
const isMessageNode = (value: unknown): value is MessageNode => isObject(value);

// The message lookup returns plain strings or compiled nodes (objects) depending on the message;
// reading both avoids breaking the day a comma makes vue-i18n compile a line.
const asText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  return isMessageNode(value) ? rt(value) : '';
};

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// Read the whole legal namespace with a STATIC key, then pick this document's sections
// in JS — never build the i18n key from `namespace` to reach a non-text (array) value.
const sections = computed((): Section[] => {
  const documents: unknown = tm('legal');
  const document = isRecord(documents) ? documents[namespace] : undefined;
  const raw = isRecord(document) ? asList(document.sections) : [];
  return raw.filter(isRecord).map((entry): Section => ({
    title: asText(entry.title),
    body: asList(entry.body).map(asText),
  }));
});

// One literal key per document: the i18n scanner (and a grep) must find every key.
const headings = {
  notice: {
    title: (): string => t('legal.notice.title'),
    lead: (): string => t('legal.notice.lead'),
  },
  privacy: {
    title: (): string => t('legal.privacy.title'),
    lead: (): string => t('legal.privacy.lead'),
  },
  terms: { title: (): string => t('legal.terms.title'), lead: (): string => t('legal.terms.lead') },
};

const title = computed((): string => headings[namespace].title());
const lead = computed((): string => headings[namespace].lead());
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
        <p class="text-muted mt-2 text-lg">{{ lead }}</p>
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
