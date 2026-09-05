// Keyed so several entry points drive the same dialog — the cross-cutting UI
// state a global useState is legitimately for (form/submission stay in the dialog).
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
