import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import Dialog from './Dialog.vue';

const { useRemindersMock, usePushRemindersMock } = vi.hoisted(() => ({
  useRemindersMock: vi.fn(),
  usePushRemindersMock: vi.fn(),
}));

mockNuxtImport('useReminders', () => useRemindersMock);
mockNuxtImport('usePushReminders', () => usePushRemindersMock);

let toggle: ReturnType<typeof vi.fn>;
let refreshState: ReturnType<typeof vi.fn>;

// A fully-available push state (browser supports it, server configured, not yet
// subscribed), overridable per test.
const pushState = (overrides: Record<string, unknown> = {}): void => {
  usePushRemindersMock.mockReturnValue({
    isSupported: ref(true),
    isConfigured: ref(true),
    isSubscribed: ref(false),
    permission: ref<NotificationPermission>('default'),
    isBusy: ref(false),
    isReady: ref(true),
    failed: ref(false),
    refreshState,
    toggle,
    ...overrides,
  });
};

beforeEach(() => {
  toggle = vi.fn(() => Promise.resolve());
  refreshState = vi.fn(() => Promise.resolve());
  useRemindersMock.mockReturnValue({
    isOpen: ref(true),
    open: vi.fn(),
    close: vi.fn(),
  });
  pushState();
});

// The modal teleports to <body>; clear it so renders don't accumulate.
afterEach(() => {
  document.body.innerHTML = '';
});

describe('RemindersDialog', () => {
  it('offers the reminders switch when push is available', async () => {
    await renderSuspended(Dialog);
    expect(screen.getByRole('switch', { name: 'Activer les rappels de soin' })).toBeTruthy();
  });

  it('turns reminders on when the switch is flipped', async () => {
    await renderSuspended(Dialog);
    await fireEvent.click(screen.getByRole('switch', { name: 'Activer les rappels de soin' }));
    expect(toggle).toHaveBeenCalledWith(true);
  });

  it('confirms reminders are on for this device once subscribed', async () => {
    pushState({ isSubscribed: ref(true) });
    await renderSuspended(Dialog);
    expect(screen.getByText('Les rappels sont activés sur cet appareil.')).toBeTruthy();
  });

  it('explains that a denied permission must be re-enabled in the browser', async () => {
    pushState({ permission: ref<NotificationPermission>('denied') });
    await renderSuspended(Dialog);
    expect(screen.getByText('Notifications bloquées')).toBeTruthy();
  });

  it('shows an unsupported message on a browser without the Push API', async () => {
    pushState({ isSupported: ref(false), isConfigured: ref(false) });
    await renderSuspended(Dialog);
    expect(screen.getByText('Non disponible sur ce navigateur')).toBeTruthy();
    expect(screen.queryByRole('switch', { name: 'Activer les rappels de soin' })).toBeNull();
  });

  it('shows an unavailable message when the server has push disabled', async () => {
    pushState({ isConfigured: ref(false) });
    await renderSuspended(Dialog);
    expect(screen.getByText('Rappels indisponibles')).toBeTruthy();
  });

  it('shows a loading skeleton while the state is still being read', async () => {
    pushState({ isReady: ref(false) });
    await renderSuspended(Dialog);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByRole('switch', { name: 'Activer les rappels de soin' })).toBeNull();
  });
});
