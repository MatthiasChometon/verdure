// The sign-in dialog lives in the shared header, mounted once for the whole app;
// a single shared ref lets any page open it without re-mounting its own copy.
export const useAuthDialog = (): DialogState => useDialogState('auth-dialog-open');
