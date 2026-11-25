import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import PlantnetKeyDialog from './PlantnetKeyDialog.vue';

const { useMutationMock, setKeyMock, useAuthMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  setKeyMock: vi.fn(),
  useAuthMock: vi.fn(),
}));
mockNuxtImport('useMutation', () => useMutationMock);
mockNuxtImport('useAuth', () => useAuthMock);
mockNuxtImport('usePlantnetKey', () => () => ({ isOpen: ref(true), close: vi.fn() }));
mockNuxtImport('GqlSetPlantnetApiKey', () => setKeyMock);

const mutation = (status: string, error?: unknown): void => {
  useMutationMock.mockImplementation((run: () => Promise<void>) => ({
    status: ref(status),
    error: ref(error),
    execute: (): Promise<void> => run(),
    clear: vi.fn(),
  }));
};

beforeEach(() => {
  setKeyMock.mockReset().mockResolvedValue({ setPlantnetApiKey: true });
  useAuthMock.mockReturnValue({ user: ref({ hasPlantnetKey: true }), refresh: vi.fn() });
});
afterEach(() => {
  document.body.innerHTML = '';
});

describe('PlantnetKeyDialog', () => {
  it('raises an alert when saving failed', async () => {
    mutation('error', new Error('boom'));
    await renderSuspended(PlantnetKeyDialog);

    expect(screen.getByRole('alert').textContent).toContain("Échec de l'enregistrement");
  });

  it('keeps an empty status region until a key is saved', async () => {
    mutation('idle');
    await renderSuspended(PlantnetKeyDialog);

    expect(screen.getByRole('status').textContent?.trim()).toBe('');
  });

  it('confirms in the status region once a key is saved', async () => {
    mutation('success');
    await renderSuspended(PlantnetKeyDialog);

    await fireEvent.update(screen.getByLabelText('Clé API'), 'my-key');
    await fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(setKeyMock).toHaveBeenCalledWith({ key: 'my-key' });
    expect(screen.getByRole('status').textContent).toContain('Clé enregistrée');
  });

  it('removes the key by sending an explicit null', async () => {
    mutation('idle');
    await renderSuspended(PlantnetKeyDialog);

    await fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));

    expect(setKeyMock).toHaveBeenCalledWith({ key: null });
  });
});
