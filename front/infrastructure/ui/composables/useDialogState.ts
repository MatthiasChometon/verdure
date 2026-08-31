// Factory for an app-wide dialog's open state, keyed so several entry points (a
// header menu, a floating button, an inline hint…) drive the same dialog. The
// form/submission stays in the dialog itself; this is only the shared open
// command — the cross-cutting UI state a global useState is legitimately for.
export const useDialogState = (key: string): DialogState => {
  const isOpen = useState<boolean>(key, (): boolean => false);

  const open = (): void => {
    isOpen.value = true;
  };
  const close = (): void => {
    isOpen.value = false;
  };

  return { isOpen, open, close };
};
