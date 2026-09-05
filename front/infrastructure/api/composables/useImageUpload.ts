type UseImageUpload = {
  upload: (file: File) => Promise<string>;
};

// One REST endpoint, one FormData shape: downscale, name the file after its
// encoded type, POST it, and hand back the storage key — or throw whatever the
// upload failed with. Each call site owns its own upload state (`key` keeps
// their useFetch entries apart), so two uploads never share one another's
// pending/error state even when they share the same endpoint.
export const useImageUpload = (
  endpoint: string,
  fileBaseName: string,
  key: string,
): UseImageUpload => {
  // Every stored image (a plant photo, a journal photo, a bug screenshot) is
  // bounded to a consistent size before upload — a phone capture is several MB /
  // ~12 MP, far more than a card, a timeline or a report thumbnail needs. 1280 px
  // on the longest side stays crisp at a fraction of the weight.
  const STORAGE_MAX_SIDE = 1280;

  const payload = ref<FormData | null>(null);
  const {
    data: result,
    error,
    execute: runUpload,
  } = useApi<{ key: string }>(endpoint, { method: 'POST', body: payload, key });

  // WebP when the browser can encode it (smaller), JPEG otherwise — never PNG.
  const buildPayload = async (file: File): Promise<FormData> => {
    const stored = await useImageDownscale(file, STORAGE_MAX_SIDE);
    const name = stored.type === 'image/webp' ? `${fileBaseName}.webp` : `${fileBaseName}.jpg`;
    const form = new FormData();
    form.append('file', stored, name);
    return form;
  };

  const upload = async (file: File): Promise<string> => {
    payload.value = await buildPayload(file);
    await runUpload();
    if (error.value || !result.value) {
      throw error.value ?? new Error('Image upload failed.');
    }
    return result.value.key;
  };

  return { upload };
};
