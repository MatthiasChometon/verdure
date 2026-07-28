type PlantShortcuts = {
  create: () => void;
  search: () => void;
  help: () => void;
  // True while a dialog is open — shortcuts stay out of its way.
  blocked: () => boolean;
};

export const isTyping = (): boolean => {
  const element = document.activeElement;
  return (
    element instanceof HTMLElement &&
    (element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.tagName === 'SELECT' ||
      element.isContentEditable)
  );
};

// Page-level shortcuts. Arrow navigation and the card actions (A/E/S) live on
// the grid itself ([[List.vue]]); A/E/S target the hovered card.
export const usePlantShortcuts = (shortcuts: PlantShortcuts): void => {
  const run =
    (action: () => void) =>
    (event: KeyboardEvent): void => {
      if (isTyping() || shortcuts.blocked()) {
        return;
      }
      event.preventDefault();
      action();
    };

  onKeyStroke(['c', 'C'], run(shortcuts.create));
  onKeyStroke('/', run(shortcuts.search));
  onKeyStroke('?', run(shortcuts.help));
};
