import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, type Ref, type VNode } from 'vue';

const { useMutationMock, useQueryMock, refreshMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  useQueryMock: vi.fn(),
  refreshMock: vi.fn(),
}));
mockNuxtImport('useMutation', () => useMutationMock);
mockNuxtImport('useQuery', () => useQueryMock);
mockNuxtImport('useRoute', () => (): Record<string, unknown> => ({ query: { code: 'ABCD' } }));
mockNuxtImport('useAuth', () => (): Record<string, unknown> => ({ user: ref({ id: 'u' }) }));

let denyError: Ref<unknown>;
let lookupStatus: Ref<string>;
let lookupData: Ref<unknown>;

beforeEach(() => {
  denyError = ref(undefined);
  lookupStatus = ref('idle');
  lookupData = ref(undefined);
  refreshMock.mockReset().mockResolvedValue(undefined);
  // usePairing declares approve first, then deny.
  useMutationMock
    .mockReset()
    .mockReturnValueOnce({ status: ref('idle'), error: ref(undefined), execute: vi.fn() })
    .mockReturnValueOnce({ error: denyError, execute: vi.fn() });
  useQueryMock.mockReturnValue({ data: lookupData, status: lookupStatus, refresh: refreshMock });
});

const mountPairing = async (): Promise<ReturnType<typeof usePairing>> => {
  let pairing: ReturnType<typeof usePairing> | undefined;
  await renderSuspended(
    defineComponent({
      setup(): () => VNode {
        pairing = usePairing();
        return () => h('div');
      },
    }),
  );
  if (pairing === undefined) {
    throw new Error('composable not mounted');
  }
  return pairing;
};

describe('usePairing state', () => {
  it('looks the code up once signed in, and again on retry', async () => {
    const pairing = await mountPairing();
    expect(refreshMock).toHaveBeenCalledTimes(1);

    await pairing.retryLookup();

    expect(refreshMock).toHaveBeenCalledTimes(2);
  });

  it('has no device when the lookup finds no pending pairing', async () => {
    const pairing = await mountPairing();
    lookupData.value = { pendingPairing: null };

    expect(pairing.device.value).toBeUndefined();
  });
});
