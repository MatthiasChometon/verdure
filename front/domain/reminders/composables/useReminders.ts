// App-wide open state for the watering-reminders dialog (mounted once); push logic
// lives in usePushReminders, owned by the dialog — this is only the shared open command.
export const useReminders = (): DialogState => useDialogState('reminders:open');
