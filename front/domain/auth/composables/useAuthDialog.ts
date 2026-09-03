type UseAuthDialog = {
  isOpen: Ref<boolean>;
  open: () => void;
};

// The sign-in dialog lives in the shared header, which the layout now mounts
// once for the whole app. Any page's sign-in prompt still needs to open it, so
// a single shared ref keeps header and pages in sync — without every page
// re-declaring, and re-mounting, its own copy of the dialog.
export const useAuthDialog = (): UseAuthDialog => {
  const isOpen = useState<boolean>('auth-dialog-open', () => false);
  const open = (): void => {
    isOpen.value = true;
  };
  return { isOpen, open };
};
