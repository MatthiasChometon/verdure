import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, ref, type Ref, type VNode } from 'vue';
import { BugStatus } from '#gql/default';

const { useMutationMock, useAsyncDataMock, refreshMock, executeMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  useAsyncDataMock: vi.fn(),
  refreshMock: vi.fn(),
  executeMock: vi.fn(),
}));
mockNuxtImport('useMutation', () => useMutationMock);
mockNuxtImport('useAsyncData', () => useAsyncDataMock);
mockNuxtImport('useAdmin', () => (): Record<string, unknown> => ({
  isAdmin: computed(() => true),
}));

let loadStatus: Ref<string>;
let loadError: Ref<unknown>;
let statusError: Ref<unknown>;
let blockedError: Ref<unknown>;

beforeEach(() => {
  loadStatus = ref('idle');
  loadError = ref(undefined);
  statusError = ref(undefined);
  blockedError = ref(undefined);
  refreshMock.mockReset().mockResolvedValue(undefined);
  executeMock.mockReset().mockResolvedValue(undefined);
  useAsyncDataMock.mockReturnValue({
    data: ref([]),
    error: loadError,
    status: loadStatus,
    refresh: refreshMock,
  });
  // useBugReportsAdmin declares the status mutation first, then the blocked one.
  useMutationMock
    .mockReset()
    .mockReturnValueOnce({ execute: executeMock, error: statusError })
    .mockReturnValueOnce({ execute: executeMock, error: blockedError });
});

const mountAdmin = async (): Promise<ReturnType<typeof useBugReportsAdmin>> => {
  let admin: ReturnType<typeof useBugReportsAdmin> | undefined;
  await renderSuspended(
    defineComponent({
      setup(): () => VNode {
        admin = useBugReportsAdmin();
        return () => h('div');
      },
    }),
  );
  if (admin === undefined) {
    throw new Error('composable not mounted');
  }
  return admin;
};

describe('useBugReportsAdmin state', () => {
  it('counts idle and pending as loading, success and error as loaded', async () => {
    const admin = await mountAdmin();

    expect(admin.isLoading.value).toBe(true);
    loadStatus.value = 'pending';
    expect(admin.isLoading.value).toBe(true);
    loadStatus.value = 'success';
    expect(admin.isLoading.value).toBe(false);
    loadStatus.value = 'error';
    expect(admin.isLoading.value).toBe(false);
  });

  it('reports a load error and retries by refreshing', async () => {
    const admin = await mountAdmin();
    loadError.value = new Error('boom');

    expect(admin.hasError.value).toBe(true);
    await admin.reload();
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it('flags a failed status change or block, and clears the flag after a success', async () => {
    const admin = await mountAdmin();
    expect(admin.actionFailed.value).toBe(false);

    statusError.value = new Error('boom');
    expect(admin.actionFailed.value).toBe(true);
    statusError.value = undefined;
    expect(admin.actionFailed.value).toBe(false);

    blockedError.value = new Error('boom');
    expect(admin.actionFailed.value).toBe(true);
  });

  it('does not refresh the list after a failed action', async () => {
    const admin = await mountAdmin();
    executeMock.mockImplementation((): Promise<void> => {
      statusError.value = new Error('boom');
      return Promise.resolve();
    });

    await admin.setStatus('1', BugStatus.FIXED);

    expect(refreshMock).not.toHaveBeenCalled();
  });
});
