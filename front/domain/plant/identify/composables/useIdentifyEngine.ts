import type { DropdownMenuItem } from '@nuxt/ui';
import type { ComputedRef, Ref } from 'vue';

export type IdentifyMode = 'auto' | 'cloud' | 'local';
export type EffectiveEngine = 'local' | 'cloud' | 'offline';

type UseIdentifyEngine = {
  mode: Ref<IdentifyMode>;
  effectiveEngine: ComputedRef<EffectiveEngine>;
  modeItems: ComputedRef<DropdownMenuItem[]>;
  aiOnline: Ref<boolean>;
  checkWorker: () => Promise<void>;
};

const MODE_STORAGE_KEY = 'verdure-identify-mode';

// Which engine identifies the photo. `cloud` (default) uses Pl@ntNet — faster and
// more accurate at plants; `local` insists on the user's own worker (private,
// never leaves the PC). `auto` is a legacy stored value (it used to prefer the
// worker) and is treated as cloud. The choice is remembered in localStorage, and
// the live worker status decides what will actually run.
export const useIdentifyEngine = (): UseIdentifyEngine => {
  const { t } = useNuxtApp().$i18n;
  const { online: aiOnline, refresh: checkWorker } = useAiWorker();

  const mode = ref<IdentifyMode>('cloud');

  onMounted((): void => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === 'local') {
        mode.value = 'local';
      } else if (saved === 'auto' || saved === 'cloud') {
        mode.value = 'cloud';
      }
    } catch {
      // Storage may be unavailable (private mode) — keep the default.
    }
  });

  const setMode = (next: IdentifyMode): void => {
    mode.value = next;
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // The preference just won't persist across visits; not worth surfacing.
    }
  };

  // The engine that WILL run given the current mode and worker status — drives the
  // hint under the button. `offline` = "My PC" chosen but nothing is connected.
  const effectiveEngine = computed((): EffectiveEngine => {
    if (mode.value === 'cloud') {
      return 'cloud';
    }
    if (mode.value === 'local') {
      return aiOnline.value ? 'local' : 'offline';
    }
    return 'cloud';
  });

  // A checkbox item shows a check on the active engine; picking another switches
  // to it, and re-picking the active one (checked → false) is a no-op (radio-like).
  const modeItems = computed((): DropdownMenuItem[] => [
    {
      label: t('plant.form.engineCloud'),
      icon: 'i-lucide-cloud',
      type: 'checkbox',
      checked: mode.value === 'cloud',
      onUpdateChecked: (checked: boolean): void => {
        if (checked) {
          setMode('cloud');
        }
      },
    },
    {
      label: t('plant.form.engineLocal'),
      icon: 'i-lucide-shield-check',
      type: 'checkbox',
      checked: mode.value === 'local',
      // No worker to run on: offer it, but disabled, so the choice is discoverable.
      disabled: !aiOnline.value,
      onUpdateChecked: (checked: boolean): void => {
        if (checked) {
          setMode('local');
        }
      },
    },
  ]);

  return { mode, effectiveEngine, modeItems, aiOnline, checkWorker };
};
