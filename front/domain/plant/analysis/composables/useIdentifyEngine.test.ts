import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import type { IdentifyMode } from './useIdentifyEngine';
import { useIdentifyEngine } from './useIdentifyEngine';

const { useAiWorkerMock } = vi.hoisted(() => ({ useAiWorkerMock: vi.fn() }));
mockNuxtImport('useAiWorker', () => useAiWorkerMock);

const STORAGE_KEY = 'verdure-identify-mode';

// Mounts the composable inside a component (it reads storage in onMounted) and
// renders the resulting mode so the test asserts what the user would get.
const modeAfterMount = async (): Promise<IdentifyMode> => {
  let current: IdentifyMode = 'cloud';
  const Harness = defineComponent({
    setup: () => {
      const { mode } = useIdentifyEngine();
      return (): ReturnType<typeof h> => {
        current = mode.value;
        return h('p', mode.value);
      };
    },
  });
  await mountSuspended(Harness);
  return current;
};

beforeEach(() => {
  useAiWorkerMock.mockReturnValue({ online: ref(false), refresh: vi.fn() });
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useIdentifyEngine stored mode', () => {
  it('starts on the cloud engine when nothing is stored', async () => {
    expect(await modeAfterMount()).toBe('cloud');
  });

  it('restores the "my PC" choice', async () => {
    localStorage.setItem(STORAGE_KEY, 'local');

    expect(await modeAfterMount()).toBe('local');
  });

  it('treats the legacy "auto" value as cloud', async () => {
    localStorage.setItem(STORAGE_KEY, 'auto');

    expect(await modeAfterMount()).toBe('cloud');
  });

  it('ignores a corrupted stored value and keeps the cloud default', async () => {
    localStorage.setItem(STORAGE_KEY, '{"mode":"local"}');

    expect(await modeAfterMount()).toBe('cloud');
  });

  it('keeps the default when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((): string => {
      throw new Error('storage blocked');
    });

    expect(await modeAfterMount()).toBe('cloud');
  });
});
