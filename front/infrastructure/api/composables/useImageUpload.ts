type UseImageUpload = {
  upload: (file: File) => Promise<string>;
};

// `key` keeps each call site's useFetch entry apart, so two uploads never
// share one another's pending/error state even on the same endpoint.
export const useImageUpload = (
  endpoint: string,
  fileBaseName: string,
  key: string,
): UseImageUpload => {
  // A phone capture is ~12 MP; 1280px on the longest side stays crisp for any
  // card/timeline/thumbnail at a fraction of the weight.
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
