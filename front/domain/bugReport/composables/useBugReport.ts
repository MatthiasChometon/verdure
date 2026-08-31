// App-wide open state so the floating button and the account menu open the same
// dialog — two ways in, one conversation. Deliberately a sibling of useImprovement,
// not a fork; the submission itself lives in the dialog (the single form owner).
export const useBugReport = (): DialogState => useDialogState('bug:open');
