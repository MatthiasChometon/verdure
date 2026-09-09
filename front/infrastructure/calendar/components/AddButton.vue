<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const { reminder, size = 'sm' } = defineProps<{
  reminder: RecurringReminder;
  size?: 'xs' | 'sm';
}>();

const { t } = useNuxtApp().$i18n;
const { icsDataUrl, googleCalendarUrl } = useCalendarEvent();

// Plain links, not a JS-triggered download: it is what makes the .ics one
// open iOS Safari's native "Add to Calendar" sheet instead of saving a file.
const items = computed((): DropdownMenuItem[] => [
  {
    label: t('calendar.downloadIcs'),
    icon: 'i-lucide-download',
    to: icsDataUrl(reminder),
    external: true,
  },
  {
    label: t('calendar.googleCalendar'),
    icon: 'i-lucide-external-link',
    to: googleCalendarUrl(reminder),
    target: '_blank',
    external: true,
  },
]);
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      :size="size"
      color="neutral"
      variant="soft"
      icon="i-lucide-calendar-plus"
      :aria-label="t('calendar.add')"
    >
      {{ t('calendar.add') }}
    </UButton>
  </UDropdownMenu>
</template>
