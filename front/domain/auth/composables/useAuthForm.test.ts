import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, type Ref, type VNode } from 'vue';

type FakeCall = {
  error: Ref<unknown>;
  status: Ref<string>;
  execute: () => Promise<void>;
  clear: () => void;
};

const { useApiMock, failResend } = vi.hoisted(() => ({
  useApiMock: vi.fn(),
  failResend: { value: true },
}));
mockNuxtImport('useApi', () => useApiMock);
mockNuxtImport('useAuth', () => (): Record<string, unknown> => ({ refresh: vi.fn() }));

beforeEach(() => {
  failResend.value = true;
  useApiMock.mockImplementation((_endpoint: unknown, options: { key: string }): FakeCall => {
    const error = ref<unknown>(null);
    const status = ref('idle');
    const call: FakeCall = {
      error,
      status,
      execute: (): Promise<void> => {
        const fails = options.key === 'auth-resend' && failResend.value;
        error.value = fails ? { statusCode: 500 } : null;
        return Promise.resolve();
      },
      clear: (): void => {
        error.value = null;
      },
    };
    return call;
  });
});

const mountForm = async (): Promise<ReturnType<typeof useAuthForm>> => {
  let form: ReturnType<typeof useAuthForm> | undefined;
  await renderSuspended(
    defineComponent({
      setup(): () => VNode {
        form = useAuthForm(vi.fn());
        return () => h('div');
      },
    }),
  );
  if (form === undefined) {
    throw new Error('form not mounted');
  }
  return form;
};

describe('useAuthForm resend', () => {
  it('flags a failed resend and does not claim the mail left', async () => {
    const form = await mountForm();

    await form.resend();

    expect(form.resendFailed.value).toBe(true);
    expect(form.info.value).toBeUndefined();
  });

  it('clears the flag on a successful resend', async () => {
    const form = await mountForm();
    await form.resend();

    failResend.value = false;
    await form.resend();

    expect(form.resendFailed.value).toBe(false);
    expect(form.info.value).toBeTruthy();
  });

  it('forgets a failed resend when the dialog is reset or the view changes', async () => {
    const form = await mountForm();
    await form.resend();
    form.reset();
    expect(form.resendFailed.value).toBe(false);

    await form.resend();
    form.setView('register');
    expect(form.resendFailed.value).toBe(false);
  });
});
