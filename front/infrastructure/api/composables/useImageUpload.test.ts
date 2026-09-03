import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useImageUpload } from './useImageUpload';

const { useApiMock, useImageDownscaleMock } = vi.hoisted(() => ({
  useApiMock: vi.fn(),
  useImageDownscaleMock: vi.fn(),
}));

mockNuxtImport('useApi', () => useApiMock);
mockNuxtImport('useImageDownscale', () => useImageDownscaleMock);

let data: ReturnType<typeof ref<{ key: string } | null>>;
let error: ReturnType<typeof ref<Error | null>>;
let execute: ReturnType<typeof vi.fn>;

beforeEach(() => {
  data = ref(null);
  error = ref(null);
  execute = vi.fn(async (): Promise<void> => {});
  useApiMock.mockReturnValue({ data, error, execute });
});

const pickedFile = (): File => new File(['x'], 'photo.png', { type: 'image/png' });

describe('useImageUpload', () => {
  it('downscales the file, posts it and returns the storage key on success', async () => {
    const appendSpy = vi.spyOn(FormData.prototype, 'append');
    useImageDownscaleMock.mockResolvedValue(new Blob(['x'], { type: 'image/webp' }));
    execute.mockImplementation(async (): Promise<void> => {
      data.value = { key: 'server-key' };
    });

    const { upload } = useImageUpload('/uploads/plant-image', 'plant', 'plant-image-upload');
    const key = await upload(pickedFile());

    expect(key).toBe('server-key');
    expect(useApiMock).toHaveBeenCalledWith(
      '/uploads/plant-image',
      expect.objectContaining({ method: 'POST', key: 'plant-image-upload' }),
    );
    expect(appendSpy).toHaveBeenCalledWith('file', expect.anything(), 'plant.webp');
    appendSpy.mockRestore();
  });

  it('names the file after the jpg fallback when the browser cannot encode webp', async () => {
    const appendSpy = vi.spyOn(FormData.prototype, 'append');
    useImageDownscaleMock.mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
    execute.mockImplementation(async (): Promise<void> => {
      data.value = { key: 'server-key' };
    });

    const { upload } = useImageUpload('/uploads/bug-image', 'screenshot', 'bug-image-upload');
    await upload(pickedFile());

    expect(appendSpy).toHaveBeenCalledWith('file', expect.anything(), 'screenshot.jpg');
    appendSpy.mockRestore();
  });

  it('throws the reactive upload error when the request fails', async () => {
    useImageDownscaleMock.mockResolvedValue(new Blob(['x'], { type: 'image/webp' }));
    const uploadError = new Error('network down');
    execute.mockImplementation(async (): Promise<void> => {
      error.value = uploadError;
    });

    const { upload } = useImageUpload('/uploads/plant-image', 'plant', 'plant-image-upload');

    await expect(upload(pickedFile())).rejects.toBe(uploadError);
  });
});
