// App-wide open state so any entry point opens the same dialog. Deliberately a
// sibling of useBugReport, not a fork of it: reporting a bug and asking for a
// feature are two different conversations that happen to look alike.
export const useImprovement = (): DialogState => useDialogState('improvement:open');
