<script setup lang="ts">
const plant = defineModel<Plant | null>({ required: true });
const emit = defineEmits<{ deleted: [] }>();

// The shared 'plants' list cache, so the row can vanish optimistically.
const { data: plantsCache } =
  useNuxtData<Awaited<ReturnType<typeof GqlPlants>>>('plants');

const deleteId = ref('');
const {
  execute: runDelete,
  error: deleteError,
  status: deleteStatus,
} = useMutation(() => GqlDeletePlant({ id: deleteId.value }));
const isDeleting = computed((): boolean => deleteStatus.value === 'pending');
const failed = ref(false);
// Held separately from `plant` so the name stays visible through the modal's
// close animation — clearing `plant` on close would blank it out mid-fade.
const displayName = ref('');

const isOpen = computed({
  get: (): boolean => plant.value !== null,
  set: (open: boolean): void => {
    if (!open) {
      plant.value = null;
    }
  },
});

watch(plant, (current): void => {
  if (current !== null) {
    failed.value = false;
    displayName.value = current.name;
  }
});

const confirm = async (): Promise<void> => {
  const target = plant.value;
  if (target === null) {
    return;
  }
  failed.value = false;
  deleteId.value = target.id;

  // Optimistic: drop it from the list right away, restore it if the call fails.
  const ok = await optimisticUpdate(
    plantsCache,
    (current) =>
      current === null || current === undefined
        ? current
        : {
            ...current,
            plants: {
              ...current.plants,
              items: current.plants.items.filter((item) => item.id !== target.id),
              total: Math.max(0, current.plants.total - 1),
            },
          },
    { execute: runDelete, error: deleteError },
  );

  if (!ok) {
    failed.value = true;
    return;
  }
  emit('deleted');
  plant.value = null;
};
</script>

<template>
  <UModal v-model:open="isOpen" :title="$t('plant.delete.title')">
    <template #body>
      <div class="flex flex-col gap-4">
        <p class="text-muted">{{ $t('plant.delete.message') }}</p>
        <p class="text-highlighted font-semibold">{{ displayName }}</p>

        <UAlert
          v-if="failed"
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="$t('plant.delete.error')"
        />

        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" :disabled="isDeleting" @click="isOpen = false">
            {{ $t('plant.delete.cancel') }}
          </UButton>
          <UButton color="error" icon="i-lucide-trash-2" :loading="isDeleting" @click="confirm">
            {{ $t('plant.delete.confirm') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
