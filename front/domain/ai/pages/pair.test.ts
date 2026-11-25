import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import Pair from './pair.vue';

const { usePairingMock, useAuthMock } = vi.hoisted(() => ({
  usePairingMock: vi.fn(),
  useAuthMock: vi.fn(),
}));
mockNuxtImport('usePairing', () => usePairingMock);
mockNuxtImport('useAuth', () => useAuthMock);
mockNuxtImport('useAuthDialog', () => () => ({ open: vi.fn() }));

type PairingState = {
  code?: string;
  device?: { code: string; label?: string };
  queryStatus?: string;
  outcome?: 'approved' | 'denied';
  approveError?: boolean;
  denyError?: boolean;
};

let retryLookup: ReturnType<typeof vi.fn>;

const renderPair = async (state: PairingState): Promise<void> => {
  usePairingMock.mockReturnValue({
    code: ref(state.code ?? 'ABCD'),
    device: ref(state.device),
    queryStatus: ref(state.queryStatus ?? 'success'),
    outcome: ref(state.outcome),
    approving: ref(false),
    approveError: ref(state.approveError ? new Error('boom') : undefined),
    denyError: ref(state.denyError ? new Error('boom') : undefined),
    approve: vi.fn(),
    deny: vi.fn(),
    retryLookup,
  });
  await renderSuspended(Pair, {
    global: {
      stubs: {
        PlantSignInPrompt: true,
        NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
      },
    },
  });
};

beforeEach(() => {
  retryLookup = vi.fn();
  useAuthMock.mockReturnValue({ isAuthReady: ref(true), isLoggedIn: ref(true) });
});

describe('pair page', () => {
  const device = { code: 'ABCD', label: 'Bureau' };

  it('raises an alert and offers a retry when the lookup itself failed', async () => {
    await renderPair({ queryStatus: 'error' });

    expect(screen.getByRole('alert').textContent).toContain('Impossible de vérifier');
    await fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(retryLookup).toHaveBeenCalledTimes(1);
  });

  it('does not confuse a successful lookup of an unknown code with a failure', async () => {
    await renderPair({});

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/Aucune demande de connexion valide/)).toBeTruthy();
  });

  it('raises an alert when approving fails', async () => {
    await renderPair({ device, approveError: true });

    expect(screen.getByRole('alert').textContent).toContain("Ça n'a pas marché");
  });

  it('raises an alert when denying fails', async () => {
    await renderPair({ device, denyError: true });

    expect(screen.getByRole('alert').textContent).toContain("Ça n'a pas marché");
  });

  it('shows no alert on a clean confirmation prompt', async () => {
    await renderPair({ device });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces the outcome politely', async () => {
    await renderPair({ device, outcome: 'approved' });

    expect(screen.getAllByRole('status').map((status) => status.textContent)).toContainEqual(
      expect.stringContaining('Ton ordinateur est connecté'),
    );
  });
});
