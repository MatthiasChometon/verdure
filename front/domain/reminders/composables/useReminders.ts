// App-wide open state for the watering-reminders dialog, so the account menu can
// open the same dialog the app mounts once. The push logic (permission +
// subscription) lives in usePushReminders, owned by the dialog itself — this is
// only the shared open command, like usePlantnetKey.
export const useReminders = (): DialogState => useDialogState('reminders:open');
