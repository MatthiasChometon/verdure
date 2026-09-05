// App-wide open state so the floating button and account menu open the same dialog.
// Sibling of useImprovement (not a fork); the dialog itself owns the submission.
export const useBugReport = (): DialogState => useDialogState('bug:open');
