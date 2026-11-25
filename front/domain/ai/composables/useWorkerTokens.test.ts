import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, type Ref, type VNode } from 'vue';

const { useMutationMock, useQueryMock, executeMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  useQueryMock: vi.fn(),
  executeMock: vi.fn(),
}));
mockNuxtImport('useMutation', () => useMutationMock);
mockNuxtImport('useQuery', () => useQueryMock);
mockNuxtImport('useAuth', () => (): Record<string, unknown> => ({ user: ref(undefined) }));

let revokeError: Ref<unknown>;

beforeEach(() => {
  revokeError = ref(undefined);
  executeMock.mockReset().mockResolvedValue(undefined);
  useMutationMock.mockImplementation(() => ({ execute: executeMock, error: revokeError }));
  useQueryMock.mockReturnValue({ data: ref(undefined), refresh: vi.fn() });
});

const mountTokens = async (): Promise<ReturnType<typeof useWorkerTokens>> => {
  let tokens: ReturnType<typeof useWorkerTokens> | undefined;
  await renderSuspended(
    defineComponent({
      setup(): () => VNode {
        tokens = useWorkerTokens();
        return () => h('div');
      },
    }),
  );
  if (tokens === undefined) {
    throw new Error('composable not mounted');
  }
  return tokens;
};

describe('useWorkerTokens revoke', () => {
  it('sets revokeFailed when the revocation failed and clears it after a success', async () => {
    const tokens = await mountTokens();
    expect(tokens.revokeFailed.value).toBe(false);

    revokeError.value = new Error('boom');
    expect(tokens.revokeFailed.value).toBe(true);

    revokeError.value = undefined;
    expect(tokens.revokeFailed.value).toBe(false);
  });

  it('marks the computer being revoked, then releases it', async () => {
    const tokens = await mountTokens();
    let during: string | undefined;
    executeMock.mockImplementation((): Promise<void> => {
      during = tokens.revokingId.value;
      return Promise.resolve();
    });

    await tokens.revoke('token-1');

    expect(during).toBe('token-1');
    expect(tokens.revokingId.value).toBeUndefined();
  });
});
