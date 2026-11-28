type PlantShortcuts = {
  create: () => void;
  search: () => void;
  help: () => void;
  // True while a dialog is open — shortcuts stay out of its way.
  blocked: () => boolean;
};

// Page-level shortcuts. Arrow navigation and the card actions (A/E/S) live on
// the grid itself (usePlantGridNavigation); A/E/S target the hovered card.
export const usePlantShortcuts = (shortcuts: PlantShortcuts): void => {
  const { isTyping } = useIsTyping();

  const run =
    (action: () => void) =>
    (event: KeyboardEvent): void => {
      // Let the OS/browser combos through (Ctrl/Cmd+C copy, etc.) — a bare key
      // triggers a shortcut, a modified one never does.
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
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
