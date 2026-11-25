<script setup lang="ts">
const { locale, locales } = useNuxtApp().$i18n;
const switchLocalePath = useSwitchLocalePath();

const localeItems = computed((): SelectItem[] =>
  locales.value.map((candidate): SelectItem => ({
    label: candidate.code.toUpperCase(),
    value: candidate.code,
  })),
);

type LocaleCode = (typeof locales)['value'][number]['code'];

const onLocaleChange = async (code: string): Promise<void> => {
  await navigateTo(switchLocalePath(code as LocaleCode));
};
</script>

<template>
  <USelect
    :model-value="locale"
    :items="localeItems"
    size="sm"
    color="neutral"
    variant="ghost"
    class="w-16 sm:w-20"
    :aria-label="$t('plant.layout.langLabel')"
    @update:model-value="onLocaleChange"
  />
</template>
