<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true });
const plant = defineModel<Plant | null>('plant', { required: true });
const emit = defineEmits<{ saved: [] }>();

const onSaved = (): void => {
  open.value = false;
  emit('saved');
};
</script>

<template>
  <UModal
    v-model:open="open"
    :title="plant === null ? $t('plant.addTitle') : $t('plant.editTitle')"
  >
    <template #body>
      <PlantSaveForm :key="plant?.id ?? 'new'" :plant="plant" @saved="onSaved" />
    </template>
  </UModal>
</template>
