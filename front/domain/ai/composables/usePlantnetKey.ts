// App-wide open state so the account menu and the identification-failure hint open
// the same dialog. The submission (save/clear) lives in the dialog, the single
// form owner; the key itself is write-only — the API only tells us whether one is
// set (hasPlantnetKey).
export const usePlantnetKey = (): DialogState => useDialogState('plantnet-key:open');
