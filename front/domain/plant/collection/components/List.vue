<script setup lang="ts">
const { plants, blocked = false } = defineProps<{
  plants: Plant[];
  // True while a dialog is open — the hover shortcuts stay out of its way.
  blocked?: boolean;
}>();

const emit = defineEmits<{ edit: [Plant]; delete: [Plant]; water: [Plant] }>();

const { focusedIndex, setCard, onFocusin, onMouseover, onMouseleave } = usePlantGridNavigation({
  plants: (): Plant[] => plants,
  blocked: (): boolean => blocked,
  onWater: (plant): void => emit('water', plant),
  onEdit: (plant): void => emit('edit', plant),
  onDelete: (plant): void => emit('delete', plant),
});
</script>

<template>
  <ul
    class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    @focusin="onFocusin"
    @mouseover="onMouseover"
    @mouseleave="onMouseleave"
  >
    <li v-for="(plant, index) in plants" :key="plant.id" class="h-full">
      <UiAnimationReveal :delay="index * 80" variant="up" class="h-full">
        <PlantCard
          :id="plant.id"
          :ref="(instance) => setCard(index, instance)"
          :data-card-index="index"
          :tabindex="index === focusedIndex ? 0 : -1"
          :name="plant.name"
          :species="plant.species"
          :description="plant.description ?? undefined"
          :image-url="plant.imageUrl ?? undefined"
          :status="useWateringStatus(plant) ?? undefined"
          :winter-rest="plant.winterRest"
          :safety="plant.safety ?? undefined"
          @edit="emit('edit', plant)"
          @delete="emit('delete', plant)"
          @water="emit('water', plant)"
        />
      </UiAnimationReveal>
    </li>
  </ul>
</template>
