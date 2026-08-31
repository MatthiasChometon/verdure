import type { Ref } from 'vue';

// The shape of an app-wide dialog's open state — produced by useDialogState and
// re-exposed under a domain name (useBugReport, useImprovement, usePlantnetKey).
export type DialogState = {
  isOpen: Ref<boolean>;
  open: () => void;
  close: () => void;
};
