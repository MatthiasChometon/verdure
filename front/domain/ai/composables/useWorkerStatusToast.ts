import type { Ref } from 'vue';

type UseWorkerStatusToast = { online: Ref<boolean> };

// The live GPU-worker status for the chrome: exposes the online signal (the
// header indicator) and raises a light toast when it flips, so the user is told
// in real time — no page refresh. The first poll's settling right after mount is
// ignored; only real changes are announced.
export const useWorkerStatusToast = (): UseWorkerStatusToast => {
  const { online } = useAiWorker();
  const { t } = useNuxtApp().$i18n;
  const toast = useToast();

  const mountedAt = ref(0);
  onMounted((): void => {
    mountedAt.value = Date.now();
  });

  watch(online, (now): void => {
    if (mountedAt.value === 0 || Date.now() - mountedAt.value < 3000) {
      return;
    }
    toast.add({
      title: now
        ? t('plant.layout.aiConnectedToast')
        : t('plant.layout.aiDisconnectedToast'),
      icon: now ? 'i-lucide-sparkles' : 'i-lucide-plug-zap',
      color: now ? 'primary' : 'neutral',
    });
  });

  return { online };
};
