// App-wide open state so the account menu and identification-failure hint share the
// dialog. Key is write-only — the API only reports whether one is set (hasPlantnetKey).
export const usePlantnetKey = (): DialogState => useDialogState('plantnet-key:open');
