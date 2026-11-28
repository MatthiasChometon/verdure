import type { Ref } from 'vue';

type Focusable = { focus: () => void };

type GridNavigationOptions = {
  plants: () => Plant[];
  // True while a dialog is open — the hover shortcuts stay out of its way.
  blocked: () => boolean;
  onWater: (plant: Plant) => void;
  onEdit: (plant: Plant) => void;
  onDelete: (plant: Plant) => void;
};

type UsePlantGridNavigation = {
  focusedIndex: Ref<number>;
  setCard: (index: number, instance: unknown) => void;
  onFocusin: (event: FocusEvent) => void;
  onMouseover: (event: MouseEvent) => void;
  onMouseleave: () => void;
};

const isFocusable = (instance: unknown): instance is Focusable =>
  typeof instance === 'object' &&
  instance !== null &&
  'focus' in instance &&
  typeof instance.focus === 'function';

// Keyboard and hover navigation of the plant grid: arrows move the roving focus
// by the visible column count, A/E/S act on the hovered (or focused) card.
export const usePlantGridNavigation = ({
  plants,
  blocked,
  onWater,
  onEdit,
  onDelete,
}: GridNavigationOptions): UsePlantGridNavigation => {
  const { isTyping } = useIsTyping();
  const { reportError } = useErrorReporting();

  // Mirror of the Tailwind grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3) so
  // arrow keys move by the right number of columns for the current width.
  const isLarge = useMediaQuery('(min-width: 1024px)');
  const isSmall = useMediaQuery('(min-width: 640px)');
  const columns = computed((): number => (isLarge.value ? 3 : isSmall.value ? 2 : 1));

  const focusedIndex = ref(0);
  const hoveredIndex = ref<number>();
  const cards: (Focusable | undefined)[] = [];

  const setCard = (index: number, instance: unknown): void => {
    cards[index] = isFocusable(instance) ? instance : undefined;
  };

  watch(
    (): number => plants().length,
    (length): void => {
      cards.length = length;
      focusedIndex.value = Math.min(focusedIndex.value, Math.max(0, length - 1));
    },
  );

  const focusCard = (index: number): void => {
    const clamped = Math.max(0, Math.min(index, plants().length - 1));
    focusedIndex.value = clamped;
    nextTick((): void => cards[clamped]?.focus()).catch((error: unknown): void =>
      reportError('plants:focus-card', error),
    );
  };

  const indexOfCard = (event: Event): number | undefined => {
    const card =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>('[data-card-index]')
        : null;
    return card === null ? undefined : Number(card.dataset.cardIndex);
  };

  // Keep the roving index in sync when a card is focused by mouse or Tab.
  const onFocusin = (event: FocusEvent): void => {
    const index = indexOfCard(event);
    if (index !== undefined) {
      focusedIndex.value = index;
    }
  };

  const onMouseover = (event: MouseEvent): void => {
    hoveredIndex.value = indexOfCard(event);
  };

  const onMouseleave = (): void => {
    hoveredIndex.value = undefined;
  };

  // Which card an A/E/S shortcut acts on: the one under the mouse, or — as a
  // keyboard fallback — the card that currently has focus.
  const targetIndex = (): number | undefined => {
    if (hoveredIndex.value !== undefined) {
      return hoveredIndex.value;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.dataset.cardIndex !== undefined) {
      return Number(active.dataset.cardIndex);
    }
    return undefined;
  };

  // A/E/S fire from anywhere on the page (global) and act on the hovered card, so
  // no click/focus is needed — just hover and press the key.
  const act =
    (fire: (plant: Plant) => void) =>
    (event: KeyboardEvent): void => {
      if (blocked() || isTyping()) {
        return;
      }
      const index = targetIndex();
      const plant = index === undefined ? undefined : plants()[index];
      if (plant === undefined) {
        return;
      }
      event.preventDefault();
      fire(plant);
    };

  onKeyStroke(['a', 'A'], act(onWater));
  onKeyStroke(['e', 'E'], act(onEdit));
  onKeyStroke(['s', 'S'], act(onDelete));

  // Arrow keys also navigate from the hovered card; clearing the hover hands
  // control back to the keyboard until the mouse moves again.
  const navigate =
    (step: () => number) =>
    (event: KeyboardEvent): void => {
      if (blocked() || isTyping()) {
        return;
      }
      const base = targetIndex();
      if (base === undefined) {
        return; // nothing hovered or focused → let the page scroll normally
      }
      event.preventDefault();
      focusCard(base + step());
      hoveredIndex.value = undefined;
    };

  onKeyStroke(
    'ArrowRight',
    navigate((): number => 1),
  );
  onKeyStroke(
    'ArrowLeft',
    navigate((): number => -1),
  );
  onKeyStroke(
    'ArrowDown',
    navigate((): number => columns.value),
  );
  onKeyStroke(
    'ArrowUp',
    navigate((): number => -columns.value),
  );

  return { focusedIndex, setCard, onFocusin, onMouseover, onMouseleave };
};
