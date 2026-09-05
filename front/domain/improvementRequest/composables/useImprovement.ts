// App-wide open state so any entry point opens the same dialog. Sibling of
// useBugReport (not a fork) — reporting and requesting are different conversations.
export const useImprovement = (): DialogState => useDialogState('improvement:open');
