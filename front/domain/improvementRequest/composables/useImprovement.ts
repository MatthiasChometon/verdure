type UseImprovement = {
  isOpen: Ref<boolean>;
  open: () => void;
  close: () => void;
};

// App-wide open state so any entry point opens the same dialog. Deliberately a
// sibling of useBugReport, not a fork of it: reporting a bug and asking for a
// feature are two different conversations that happen to look alike. The
// submission lives in the dialog (the single owner of the form); this is only the
// shared open command.
export const useImprovement = (): UseImprovement => {
  const isOpen = useState<boolean>('improvement:open', (): boolean => false);
  return {
    isOpen,
    open: (): void => {
      isOpen.value = true;
    },
    close: (): void => {
      isOpen.value = false;
    },
  };
};
