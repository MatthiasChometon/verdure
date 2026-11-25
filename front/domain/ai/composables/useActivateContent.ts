type Text = () => string;

type ActivateRequirement = { key: 'os' | 'gpu' | 'ram' | 'disk'; icon: string; label: Text };
type ActivatePerk = {
  key: 'private' | 'power' | 'smartSearch' | 'free';
  icon: string;
  title: Text;
};
type ActivateCapability = {
  key: 'diagnosis' | 'search' | 'recognition';
  icon: string;
  title: Text;
  desc: Text;
};
type ActivatePanel = { key: 'local' | 'connect' | 'anywhere'; title: Text; desc: Text };
type ActivateStep = { number: number; title: Text };

type UseActivateContent = {
  folderUrl: string;
  requirements: ActivateRequirement[];
  perks: ActivatePerk[];
  capabilities: ActivateCapability[];
  panels: ActivatePanel[];
  steps: ActivateStep[];
};

// Every text is a function holding a literal i18n key, so the translation scanner can
// check it (no key built at render time) and it follows the locale.
export const useActivateContent = (): UseActivateContent => {
  const { t } = useNuxtApp().$i18n;

  return {
    // Small installer (~2 MB): fetches the runtime, installs under AI\ComfyUI_windows_portable
    // and adds a tray launcher — local install, no security prompt, no CLI, no Docker.
    folderUrl: 'https://verdureee.duckdns.org/dl/verdure%20ia.exe',

    // What the computer needs for the folder to run — the honest checklist, shown
    // before the steps so nobody downloads 5.5 GB for nothing.
    requirements: [
      { key: 'os', icon: 'i-lucide-monitor', label: () => t('ai.activate.req.os') },
      { key: 'gpu', icon: 'i-lucide-cpu', label: () => t('ai.activate.req.gpu') },
      { key: 'ram', icon: 'i-lucide-memory-stick', label: () => t('ai.activate.req.ram') },
      { key: 'disk', icon: 'i-lucide-hard-drive', label: () => t('ai.activate.req.disk') },
    ],

    // The "limits" (needs a GPU, runs locally) said as the benefits they are.
    perks: [
      { key: 'private', icon: 'i-lucide-lock', title: () => t('ai.activate.perks.private.title') },
      { key: 'power', icon: 'i-lucide-cpu', title: () => t('ai.activate.perks.power.title') },
      {
        key: 'smartSearch',
        icon: 'i-lucide-sparkles',
        title: () => t('ai.activate.perks.smartSearch.title'),
      },
      { key: 'free', icon: 'i-lucide-gift', title: () => t('ai.activate.perks.free.title') },
    ],

    // What the local AI actually lets you do, shown up front so the value is clear
    // before the setup steps.
    capabilities: [
      {
        key: 'diagnosis',
        icon: 'i-lucide-stethoscope',
        title: () => t('ai.activate.capabilities.items.diagnosis.title'),
        desc: () => t('ai.activate.capabilities.items.diagnosis.desc'),
      },
      {
        key: 'search',
        icon: 'i-lucide-search',
        title: () => t('ai.activate.capabilities.items.search.title'),
        desc: () => t('ai.activate.capabilities.items.search.desc'),
      },
      {
        key: 'recognition',
        icon: 'i-lucide-leaf',
        title: () => t('ai.activate.capabilities.items.recognition.title'),
        desc: () => t('ai.activate.capabilities.items.recognition.desc'),
      },
    ],

    // The three diagrams of "how it works" and their captions.
    panels: [
      {
        key: 'local',
        title: () => t('ai.activate.hiw.local.title'),
        desc: () => t('ai.activate.hiw.local.desc'),
      },
      {
        key: 'connect',
        title: () => t('ai.activate.hiw.connect.title'),
        desc: () => t('ai.activate.hiw.connect.desc'),
      },
      {
        key: 'anywhere',
        title: () => t('ai.activate.hiw.anywhere.title'),
        desc: () => t('ai.activate.hiw.anywhere.desc'),
      },
    ],

    steps: [
      { number: 1, title: () => t('ai.activate.step1Title') },
      { number: 2, title: () => t('ai.activate.step2Title') },
      { number: 3, title: () => t('ai.activate.step3Title') },
    ],
  };
};
