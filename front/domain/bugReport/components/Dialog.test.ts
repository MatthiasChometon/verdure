import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import Dialog from './Dialog.vue';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
mockNuxtImport('useBugReport', () => (): Record<string, unknown> => ({
  isOpen: ref(true),
  close: vi.fn(),
}));
mockNuxtImport('GqlReportBug', () => sendMock);

beforeEach(() => {
  sendMock.mockReset();
  // useMutation keys its state by useId(), the same in every render: start each case clean.
  clearNuxtData();
});
afterEach(() => {
  document.body.innerHTML = '';
});

const send = async (): Promise<void> => {
  await renderSuspended(Dialog);
  await fireEvent.update(
    screen.getByLabelText(/Qu'est-ce qui ne va pas/),
    'Un message assez long pour passer',
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
};

describe('bugReport Dialog', () => {
  it('keeps an empty status region until something was sent', async () => {
    await renderSuspended(Dialog);

    expect(screen.getByRole('status').textContent?.trim()).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces the thanks in the status region once sent', async () => {
    sendMock.mockResolvedValue({});
    await send();

    await vi.waitFor((): void => {
      expect(screen.getByRole('status').textContent).toContain("Merci, c'est envoyé");
    });
  });

  it('raises an alert when sending failed and keeps the words', async () => {
    sendMock.mockRejectedValue(new Error('boom'));
    await send();

    await vi.waitFor((): void => {
      expect(screen.getByRole('alert').textContent).toContain("L'envoi a échoué");
    });
    expect(screen.getByLabelText(/Qu'est-ce qui ne va pas/).value).toContain('Un message');
  });
});
