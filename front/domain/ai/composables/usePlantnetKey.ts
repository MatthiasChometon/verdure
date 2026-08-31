type UsePlantnetKey = {
  isOpen: Ref<boolean>;
  open: () => void;
  close: () => void;
};

// App-wide open state so the account menu and the identification-failure hint open
// the same dialog. The save/clear mutation lives in the dialog (the single owner
// of the form); this is only the shared open command. The key itself is
// write-only — the API only ever tells us whether one is set (`hasPlantnetKey`).
export const usePlantnetKey = (): UsePlantnetKey => {
  const isOpen = useState<boolean>('plantnet-key:open', (): boolean => false);

  const open = (): void => {
    isOpen.value = true;
  };
  const close = (): void => {
    isOpen.value = false;
  };

  return { isOpen, open, close };
};
