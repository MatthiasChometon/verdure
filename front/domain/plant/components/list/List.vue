<script setup lang="ts">
const { plants, blocked = false } = defineProps<{
  plants: Plant[];
  // True while a dialog is open — the hover shortcuts stay out of its way.
  blocked?: boolean;
}>();

const emit = defineEmits<{ edit: [Plant]; delete: [Plant]; water: [Plant] }>();

// Mirror of the Tailwind grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3) so
// arrow keys move by the right number of columns for the current width.
const isLarge = useMediaQuery('(min-width: 1024px)');
const isSmall = useMediaQuery('(min-width: 640px)');
const columns = computed((): number => (isLarge.value ? 3 : isSmall.value ? 2 : 1));

const focusedIndex = ref(0);
const hoveredIndex = ref<number | null>(null);
const cards = ref<({ focus: () => void } | null)[]>([]);

watch(
  () => plants.length,
  (length) => {
    cards.value.length = length;
    focusedIndex.value = Math.min(focusedIndex.value, Math.max(0, length - 1));
  },
);

const focusCard = (index: number): void => {
  const clamped = Math.max(0, Math.min(index, plants.length - 1));
  focusedIndex.value = clamped;
  nextTick(() => cards.value[clamped]?.focus());
};

const cardUnder = (event: Event): HTMLElement | null =>
  event.target instanceof HTMLElement
    ? event.target.closest<HTMLElement>('[data-card-index]')
    : null;

// Keep the roving index in sync when a card is focused by mouse or Tab.
const onFocusin = (event: FocusEvent): void => {
  const card = cardUnder(event);
  if (card !== null) {
    focusedIndex.value = Number(card.dataset.cardIndex);
  }
};

const onMouseover = (event: MouseEvent): void => {
  const card = cardUnder(event);
  hoveredIndex.value = card !== null ? Number(card.dataset.cardIndex) : null;
};

// Which card an A/E/S shortcut acts on: the one under the mouse, or — as a
// keyboard fallback — the card that currently has focus.
const targetIndex = (): number | null => {
  if (hoveredIndex.value !== null) {
    return hoveredIndex.value;
  }
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.dataset.cardIndex !== undefined) {
    return Number(active.dataset.cardIndex);
  }
  return null;
};

// A/E/S fire from anywhere on the page (global) and act on the hovered card, so
// no click/focus is needed — just hover and press the key.
const act =
  (fire: (plant: Plant) => void) =>
  (event: KeyboardEvent): void => {
    if (blocked || isTyping()) {
      return;
    }
    const index = targetIndex();
    if (index === null) {
      return;
    }
    const plant = plants[index];
    if (plant === undefined) {
      return;
    }
    event.preventDefault();
    fire(plant);
  };

onKeyStroke(
  ['a', 'A'],
  act((plant) => emit('water', plant)),
);
onKeyStroke(
  ['e', 'E'],
  act((plant) => emit('edit', plant)),
);
onKeyStroke(
  ['s', 'S'],
  act((plant) => emit('delete', plant)),
);

// Arrow keys navigate from the hovered card too (or the focused one), so you
// can hover a card and immediately move around with the keyboard. Clearing the
// hover hands control to the keyboard until the mouse moves again.
const navigate =
  (step: () => number) =>
  (event: KeyboardEvent): void => {
    if (blocked || isTyping()) {
      return;
    }
    const base = targetIndex();
    if (base === null) {
      return; // nothing hovered or focused → let the page scroll normally
    }
    event.preventDefault();
    focusCard(base + step());
    hoveredIndex.value = null;
  };

onKeyStroke(
  'ArrowRight',
  navigate(() => 1),
);
onKeyStroke(
  'ArrowLeft',
  navigate(() => -1),
);
onKeyStroke(
  'ArrowDown',
  navigate(() => columns.value),
);
onKeyStroke(
  'ArrowUp',
  navigate(() => -columns.value),
);
</script>

<template>
  <ul
    class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    @focusin="onFocusin"
    @mouseover="onMouseover"
    @mouseleave="hoveredIndex = null"
  >
    <li v-for="(plant, index) in plants" :key="plant.id" class="h-full">
      <UiAnimationReveal :delay="index * 80" variant="up" class="h-full">
        <PlantCard
          :id="plant.id"
          :ref="(instance) => (cards[index] = instance as { focus: () => void } | null)"
          :data-card-index="index"
          :tabindex="index === focusedIndex ? 0 : -1"
          :name="plant.name"
          :species="plant.species"
          :description="plant.description"
          :image-url="plant.imageUrl"
          :status="useWateringStatus(plant)"
          @edit="emit('edit', plant)"
          @delete="emit('delete', plant)"
          @water="emit('water', plant)"
        />
      </UiAnimationReveal>
    </li>
  </ul>
</template>
