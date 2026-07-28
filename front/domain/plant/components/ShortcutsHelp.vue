<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true });

const { t } = useNuxtApp().$i18n;

const rows = computed((): { keys: string[]; label: string }[] => [
  { keys: ['↑', '↓', '←', '→'], label: t('plant.shortcuts.navigate') },
  { keys: ['A'], label: t('plant.shortcuts.water') },
  { keys: ['E'], label: t('plant.shortcuts.edit') },
  { keys: ['S'], label: t('plant.shortcuts.delete') },
  { keys: ['C'], label: t('plant.shortcuts.create') },
  { keys: ['/'], label: t('plant.shortcuts.search') },
  { keys: ['?'], label: t('plant.shortcuts.help') },
  { keys: [t('plant.shortcuts.escKey')], label: t('plant.shortcuts.close') },
]);
</script>

<template>
  <UModal v-model:open="open" :title="$t('plant.shortcuts.title')">
    <template #body>
      <ul class="flex flex-col gap-2.5">
        <li
          v-for="row in rows"
          :key="row.label"
          class="flex items-center justify-between gap-4"
        >
          <span class="text-muted text-sm">{{ row.label }}</span>
          <span class="flex flex-wrap justify-end gap-1">
            <kbd
              v-for="key in row.keys"
              :key="key"
              class="border-default bg-elevated text-highlighted rounded border px-2 py-0.5 text-xs font-medium"
            >
              {{ key }}
            </kbd>
          </span>
        </li>
      </ul>
    </template>
  </UModal>
</template>
