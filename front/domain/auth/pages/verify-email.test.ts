import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import VerifyEmail from './verify-email.vue';

const { useEmailVerificationMock } = vi.hoisted(() => ({ useEmailVerificationMock: vi.fn() }));
mockNuxtImport('useEmailVerification', () => useEmailVerificationMock);
// The link target is irrelevant here; the real helper needs the i18n router.
mockNuxtImport(
  'useLocalePath',
  () =>
    () =>
    (path: string): string =>
      path,
);

const renderWith = async (state: 'pending' | 'success' | 'error'): Promise<void> => {
  useEmailVerificationMock.mockReturnValue({ state: ref(state) });
  await renderSuspended(VerifyEmail, {
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  });
};

describe('verify-email page', () => {
  it('announces the verification in progress politely', async () => {
    await renderWith('pending');

    expect(screen.getByRole('status').textContent).toContain('Vérification en cours');
  });

  it('announces the success politely', async () => {
    await renderWith('success');

    expect(screen.getByRole('status').textContent).toContain('Email vérifié');
  });

  it('raises an alert for an invalid or expired link, and stays silent otherwise', async () => {
    await renderWith('error');

    expect(screen.getByRole('alert').textContent).toContain('Lien invalide ou expiré');
    expect(screen.getByRole('status').textContent?.trim()).toBe('');
  });
});
