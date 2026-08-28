type UseBugReport = {
  isOpen: Ref<boolean>;
  open: () => void;
  close: () => void;
};

// App-wide open state so the floating button and the account menu open the same
// dialog — two ways in, one conversation. The submission itself lives in the
// dialog (the single place that owns the form); this is only the shared open
// command, the kind of cross-cutting UI state a global useState is legitimately
// for (reached from a header on every page and a floating button).
export const useBugReport = (): UseBugReport => {
  const isOpen = useState<boolean>('bug:open', (): boolean => false);
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
