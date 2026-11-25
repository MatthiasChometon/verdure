import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';
import Ameliorations from './ameliorations.vue';

type AdminState = { hasError: boolean; isLoading: boolean; actionFailed: boolean };

const { adminMock, reloadMock } = vi.hoisted(() => ({ adminMock: vi.fn(), reloadMock: vi.fn() }));
mockNuxtImport('useImprovementRequestsAdmin', () => adminMock);
mockNuxtImport('useAdmin', () => (): Record<string, unknown> => ({
  isAdmin: computed(() => true),
}));

const request = {
  id: '1',
  message: 'Trier par pièce',
  importance: 'WOULD_HELP',
  status: 'NEW',
  createdAt: '2026-03-01T10:00:00Z',
  requestedBy: undefined,
  context: { page: '/mes-plantes' },
};

const state = (overrides: Partial<AdminState>, requests: unknown[] = []): void => {
  adminMock.mockReturnValue({
    requests: computed(() => requests),
    hasError: computed(() => overrides.hasError ?? false),
    isLoading: computed(() => overrides.isLoading ?? false),
    actionFailed: computed(() => overrides.actionFailed ?? false),
    reload: reloadMock,
    setStatus: vi.fn(),
  });
};

beforeEach(() => {
  reloadMock.mockReset();
});

describe('ameliorations page', () => {
  it('raises an alert with a retry button when loading failed', async () => {
    state({ hasError: true });
    await renderSuspended(Ameliorations);

    expect(screen.getByRole('alert').textContent).toContain('Impossible de charger');
    await fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('announces the loading state', async () => {
    state({ isLoading: true });
    await renderSuspended(Ameliorations);

    expect(screen.getByRole('status').textContent).toContain('Chargement');
  });

  it('raises an alert when a moderation action failed', async () => {
    state({ actionFailed: true }, [request]);
    await renderSuspended(Ameliorations);

    expect(screen.getByRole('alert').textContent).toContain("n'a pas pu être enregistrée");
  });

  it('stays silent when everything worked', async () => {
    state({}, [request]);
    await renderSuspended(Ameliorations);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Trier par pièce')).toBeTruthy();
  });
});
