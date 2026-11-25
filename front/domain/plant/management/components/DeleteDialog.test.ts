import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import DeleteDialog from './DeleteDialog.vue';

const { useMutationMock, useOptimisticUpdateMock } = vi.hoisted(() => ({
  useMutationMock: vi.fn(),
  useOptimisticUpdateMock: vi.fn(),
}));
mockNuxtImport('useMutation', () => useMutationMock);
mockNuxtImport('useOptimisticUpdate', () => useOptimisticUpdateMock);

const plant: Plant = {
  id: '1',
  name: 'Monstera',
  species: 'Monstera deliciosa',
  imageUrl: null,
  winterRest: false,
};

beforeEach(() => {
  useMutationMock.mockReturnValue({
    status: ref('idle'),
    error: ref(),
    execute: vi.fn(),
  });
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PlantDeleteDialog failure', () => {
  it('announces the failure as an alert when the deletion is rejected', async () => {
    useOptimisticUpdateMock.mockResolvedValue(false);
    await mountSuspended(DeleteDialog, { props: { modelValue: plant } });

    expect(document.querySelector('[role="alert"]')).toBeNull();

    await fireEvent.click(await screen.findByRole('button', { name: 'Supprimer' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('La suppression a échoué. Réessayez.');
  });
});
