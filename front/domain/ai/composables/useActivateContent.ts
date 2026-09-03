type ActivateRequirement = { key: 'os' | 'gpu' | 'ram' | 'disk'; icon: string };
type ActivatePerk = { key: 'private' | 'power' | 'smartSearch' | 'free'; icon: string };
type ActivateCapability = { key: 'diagnosis' | 'search' | 'recognition'; icon: string };

type UseActivateContent = {
  folderUrl: string;
  requirements: ActivateRequirement[];
  perks: ActivatePerk[];
  capabilities: ActivateCapability[];
};

// The static content of the "activate AI" page: the installer link, the honest
// requirements checklist, the perks said as benefits, and the capabilities the
// local AI unlocks.
export const useActivateContent = (): UseActivateContent => ({
  // A small installer (~2 MB, hosted on o2switch): run it once, it fetches the
  // runtime, installs the app under AI\ComfyUI_windows_portable and adds a
  // system-tray launcher — installed locally, so it runs with no security prompt
  // afterwards. No command line, no Docker.
  folderUrl: 'https://verdureee.duckdns.org/dl/verdure%20ia.exe',

  // What the computer needs for the folder to run — the honest checklist, shown
  // before the steps so nobody downloads 5.5 GB for nothing.
  requirements: [
    { key: 'os', icon: 'i-lucide-monitor' },
    { key: 'gpu', icon: 'i-lucide-cpu' },
    { key: 'ram', icon: 'i-lucide-memory-stick' },
    { key: 'disk', icon: 'i-lucide-hard-drive' },
  ],

  // The "limits" (needs a GPU, runs locally) said as the benefits they are.
  perks: [
    { key: 'private', icon: 'i-lucide-lock' },
    { key: 'power', icon: 'i-lucide-cpu' },
    { key: 'smartSearch', icon: 'i-lucide-sparkles' },
    { key: 'free', icon: 'i-lucide-gift' },
  ],

  // What the local AI actually lets you do, shown up front so the value is clear
  // before the setup steps.
  capabilities: [
    { key: 'diagnosis', icon: 'i-lucide-stethoscope' },
    { key: 'search', icon: 'i-lucide-search' },
    { key: 'recognition', icon: 'i-lucide-leaf' },
  ],
});
