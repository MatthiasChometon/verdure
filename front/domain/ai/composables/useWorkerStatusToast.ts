import type { Ref } from 'vue';

type UseWorkerStatusToast = { online: Ref<boolean> };

const TOAST_SETTLE_MS = 3000;

// The live GPU-worker status for the chrome: exposes the online signal (the header
// indicator) and raises a light toast when it flips, so the user is told in real
// time. The first poll's settling right after mount is ignored; only real changes
// are announced.
export const useWorkerStatusToast = (): UseWorkerStatusToast => {
  const { online } = useAiWorker();
  const { t } = useNuxtApp().$i18n;
  const toast = useToast();

  const mountedAt = ref(0);
  onMounted((): void => {
    mountedAt.value = Date.now();
  });

  const justMounted = (): boolean =>
    mountedAt.value === 0 || Date.now() - mountedAt.value < TOAST_SETTLE_MS;

  const announceStatusChange = (isOnline: boolean): void => {
    if (justMounted()) {
      return;
    }
    toast.add({
      title: isOnline
        ? t('plant.layout.aiConnectedToast')
        : t('plant.layout.aiDisconnectedToast'),
      icon: isOnline ? 'i-lucide-sparkles' : 'i-lucide-plug-zap',
      color: isOnline ? 'primary' : 'neutral',
    });
  };

  watch(online, announceStatusChange);

  return { online };
};
