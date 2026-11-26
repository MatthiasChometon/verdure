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

// GraphQL nulls become `undefined` once, here, instead of per prop in the template.
const cards = computed(() =>
  plants.map((plant) => ({
    plant,
    description: plant.description ?? undefined,
    imageUrl: plant.imageUrl ?? undefined,
    status: useWateringStatus(plant),
    safety: plant.safety ?? undefined,
  })),
);
</script>

<template>
  <ul
    class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    @focusin="onFocusin"
    @mouseover="onMouseover"
    @mouseleave="onMouseleave"
  >
    <li
      v-for="({ plant, description, imageUrl, status, safety }, index) in cards"
      :key="plant.id"
      class="h-full"
    >
      <!-- The first row renders at once. Each card after it takes an idle turn of its own (about
           one card per task, so none is a long one) and holds its place meanwhile. -->
      <UiAnimationIdle :now="index < 3" min-height="20rem" class="h-full">
        <UiAnimationReveal :delay="index * 80" variant="up" class="h-full">
          <PlantCard
            :id="plant.id"
            :ref="(instance) => setCard(index, instance)"
            :data-card-index="index"
            :tabindex="index === focusedIndex ? 0 : -1"
            :name="plant.name"
            :species="plant.species"
            :description="description"
            :image-url="imageUrl"
            :status="status"
            :winter-rest="plant.winterRest"
            :safety="safety"
            :eager="index < 3"
            @edit="emit('edit', plant)"
            @delete="emit('delete', plant)"
            @water="emit('water', plant)"
          />
        </UiAnimationReveal>
      </UiAnimationIdle>
    </li>
  </ul>
</template>
