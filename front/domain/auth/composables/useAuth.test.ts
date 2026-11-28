import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref, type Ref } from 'vue';
import { useAuth } from './useAuth';

const { useQueryMock, useApiMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useApiMock: vi.fn(),
}));

mockNuxtImport('useQuery', () => useQueryMock);
mockNuxtImport('useApi', () => useApiMock);

let googleStatus: Ref<string>;
let refreshGoogle: ReturnType<typeof vi.fn>;
let auth: ReturnType<typeof useAuth>;

const mountAuth = async (): Promise<void> => {
  await renderSuspended(
    defineComponent({
      setup: (): Record<string, never> => {
        auth = useAuth();
        return {};
      },
      template: '<div />',
    }),
  );
};

beforeEach(() => {
  googleStatus = ref('idle');
  refreshGoogle = vi.fn().mockResolvedValue(undefined);
  useQueryMock.mockImplementation((key: string) =>
    key === 'google-enabled'
      ? { data: ref({ googleEnabled: true }), status: googleStatus, refresh: refreshGoogle }
      : { data: ref(undefined), status: ref('idle'), refresh: vi.fn() },
  );
  useApiMock.mockReturnValue({ execute: vi.fn() });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAuth Google flag', () => {
  it('loads the flag once, even when the dialog and the idle callback both ask', async () => {
    await mountAuth();

    await auth.loadGoogleEnabled();
    googleStatus.value = 'success';
    await auth.loadGoogleEnabled();

    expect(refreshGoogle).toHaveBeenCalledTimes(1);
  });

  it('logs a failed load instead of swallowing it', async () => {
    const error = new Error('network down');
    refreshGoogle.mockRejectedValue(error);
    const log = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
    await mountAuth();

    await auth.loadGoogleEnabled();

    expect(log).toHaveBeenCalledWith(expect.stringContaining('Google'), error);
  });
});
