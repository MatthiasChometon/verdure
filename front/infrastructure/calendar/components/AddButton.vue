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

const iconClass = 'size-4 shrink-0';
const isMenuMounted = ref(false);
const trigger = useTemplateRef<{ $el: HTMLElement }>('trigger');
const mountMenu = async (): Promise<void> => {
  isMenuMounted.value = true;
  await nextTick();
  trigger.value?.$el.focus();
};
</script>

<template>
  <!-- A plain button until the first click: the dropdown (a Nuxt UI popper tree per button, and
       there is one per care type) mounts then, already open, with the focus kept on the trigger. -->
  <UDropdownMenu v-if="isMenuMounted" :items="items" default-open>
    <UiPlainButton ref="trigger" :size="size" variant="soft" color="neutral">
      <UIcon name="i-lucide-calendar-plus" :class="iconClass" aria-hidden="true" />
      {{ t('calendar.add') }}
    </UiPlainButton>
  </UDropdownMenu>
  <UiPlainButton v-else :size="size" variant="soft" color="neutral" @click="mountMenu">
    <UIcon name="i-lucide-calendar-plus" :class="iconClass" aria-hidden="true" />
    {{ t('calendar.add') }}
  </UiPlainButton>
</template>
