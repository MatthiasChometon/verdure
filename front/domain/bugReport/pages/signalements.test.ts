import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';
import Signalements from './signalements.vue';

type AdminState = { hasError: boolean; isLoading: boolean; actionFailed: boolean };

const { adminMock, reloadMock } = vi.hoisted(() => ({ adminMock: vi.fn(), reloadMock: vi.fn() }));
mockNuxtImport('useBugReportsAdmin', () => adminMock);
mockNuxtImport('useAdmin', () => (): Record<string, unknown> => ({
  isAdmin: computed(() => true),
}));

const report = {
  id: '1',
  message: 'Le bouton ne répond pas',
  severity: 'ANNOYING',
  status: 'NEW',
  createdAt: '2026-03-01T10:00:00Z',
  reportedBy: undefined,
  imageUrl: undefined,
  blocked: false,
  context: { page: '/mes-plantes', userAgent: 'test' },
};

const state = (overrides: Partial<AdminState>, reports: unknown[] = []): void => {
  adminMock.mockReturnValue({
    reports: computed(() => reports),
    hasError: computed(() => overrides.hasError ?? false),
    isLoading: computed(() => overrides.isLoading ?? false),
    actionFailed: computed(() => overrides.actionFailed ?? false),
    reload: reloadMock,
    setStatus: vi.fn(),
    setBlocked: vi.fn(),
  });
};

beforeEach(() => {
  reloadMock.mockReset();
});

describe('signalements page', () => {
  it('raises an alert with a retry button when loading failed', async () => {
    state({ hasError: true });
    await renderSuspended(Signalements);

    expect(screen.getByRole('alert').textContent).toContain('Impossible de charger');
    await fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('announces the loading state', async () => {
    state({ isLoading: true });
    await renderSuspended(Signalements);

    expect(screen.getByRole('status').textContent).toContain('Chargement');
  });

  it('raises an alert when a moderation action failed', async () => {
    state({ actionFailed: true }, [report]);
    await renderSuspended(Signalements);

    expect(screen.getByRole('alert').textContent).toContain("n'a pas pu être enregistrée");
  });

  it('stays silent when everything worked', async () => {
    state({}, [report]);
    await renderSuspended(Signalements);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Le bouton ne répond pas')).toBeTruthy();
  });
});
